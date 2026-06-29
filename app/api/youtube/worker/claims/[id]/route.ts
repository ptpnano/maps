import { db } from "@/lib/db";
import { recalculateYoutubeOrder } from "@/lib/youtube-orders";
import { authenticateYoutubeWorker, workerAuthResponse } from "@/lib/youtube-worker-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const historySchema = z.object({
  gmail: z.string().max(255).optional().nullable(),
  ip: z.string().max(100).optional().nullable(),
  actedAt: z.string().datetime().optional(),
  status: z.string().min(1).max(50).default("success"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const updateSchema = z.object({
  workerKey: z.string().min(3).max(120).optional(),
  status: z.enum(["claimed", "running", "partial", "done", "completed", "failed", "expired"]),
  successCount: z.number().int().min(0).optional(),
  failedCount: z.number().int().min(0).optional(),
  error: z.string().max(2000).optional().nullable(),
  detail: z.record(z.string(), z.unknown()).optional().default({}),
  history: z.array(historySchema).max(1000).optional().default([]),
});

function parseActedAt(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeGmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid claim update", details: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;
    const auth = await authenticateYoutubeWorker(req, body.workerKey || null);
    if ("error" in auth) return workerAuthResponse(auth.error, auth.status);
    const workerKey = auth.workerKey;
    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      const claimTarget = await tx.youtubeWorkerClaimTarget.findUnique({
        where: { id },
        include: { target: true, claim: true },
      });
      if (!claimTarget) return { notFound: true as const };
      if (claimTarget.workerKey !== workerKey) return { forbidden: true as const };

      const remainingSuccessSlots = Math.max(0, claimTarget.claimedQuantity - claimTarget.successCount);
      const successHistory = body.history
        .filter((row) => row.status === "success" && normalizeGmail(row.gmail))
        .slice(0, remainingSuccessSlots);
      const otherHistory = body.history.filter((row) => !(row.status === "success" && normalizeGmail(row.gmail)));

      let acceptedSuccessDelta = 0;
      if (successHistory.length > 0) {
        const created = await tx.youtubeWorkerActionHistory.createMany({
          data: successHistory.map((row) => ({
            claimTargetId: claimTarget.id,
            orderId: claimTarget.orderId,
            targetId: claimTarget.targetId,
            workerKey,
            serviceType: claimTarget.serviceType,
            targetKey: claimTarget.targetKey,
            gmail: normalizeGmail(row.gmail),
            ip: row.ip || null,
            status: "success",
            actedAt: parseActedAt(row.actedAt),
            metadata: row.metadata as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
        acceptedSuccessDelta = created.count;
      }
      if (otherHistory.length > 0) {
        await tx.youtubeWorkerActionHistory.createMany({
          data: otherHistory.map((row) => ({
            claimTargetId: claimTarget.id,
            orderId: claimTarget.orderId,
            targetId: claimTarget.targetId,
            workerKey,
            serviceType: claimTarget.serviceType,
            targetKey: claimTarget.targetKey,
            gmail: normalizeGmail(row.gmail) || null,
            ip: row.ip || null,
            status: row.status,
            actedAt: parseActedAt(row.actedAt),
            metadata: {
              ...row.metadata,
              countedForQuota: false,
              ignoredReason: row.status === "success" ? "missing_gmail" : undefined,
            } as Prisma.InputJsonValue,
          })),
        });
      }

      const nextSuccess = Math.min(claimTarget.successCount + acceptedSuccessDelta, claimTarget.claimedQuantity);
      const nextFailed = Math.max(0, body.failedCount ?? claimTarget.failedCount);
      const successDelta = acceptedSuccessDelta;
      const normalizedStatus = body.status === "completed" ? "done" : body.status;
      const targetQuotaDone = Math.min(
        claimTarget.target.executionQuantity,
        Number(claimTarget.target.ytbQuotaDone || 0) + successDelta,
      );
      const targetDone = targetQuotaDone >= claimTarget.target.executionQuantity;
      const targetStatus = targetDone ? "done" : normalizedStatus === "failed" ? "partial" : "active";

      const updatedClaimTarget = await tx.youtubeWorkerClaimTarget.update({
        where: { id },
        data: {
          status: normalizedStatus,
          successCount: nextSuccess,
          failedCount: nextFailed,
          lastError: body.error || null,
          detail: body.detail as Prisma.InputJsonValue,
          ...(normalizedStatus === "running" || normalizedStatus === "claimed"
            ? { leaseUntil: new Date(now.getTime() + 10 * 60 * 1000) }
            : {}),
        },
      });

      const updatedTarget = await tx.youtubeOrderTarget.update({
        where: { id: claimTarget.targetId },
        data: {
          deliveredQuantity: Math.min(targetQuotaDone, claimTarget.target.quantity),
          ytbStatus: targetStatus,
          ytbQuotaDone: targetQuotaDone,
          ytbQuotaTotal: claimTarget.target.executionQuantity,
          ytbLastError: body.error || null,
          ytbLastDetail: {
            claimTargetId: claimTarget.id,
            workerKey,
            status: normalizedStatus,
            successCount: nextSuccess,
            failedCount: nextFailed,
            updatedAt: now.toISOString(),
            detail: body.detail,
          } as Prisma.InputJsonValue,
          lastSyncedAt: now,
        },
      });

      const totals = await tx.youtubeWorkerClaimTarget.aggregate({
        where: { claimId: claimTarget.claimId },
        _sum: { claimedQuantity: true, successCount: true, failedCount: true },
      });
      const openCount = await tx.youtubeWorkerClaimTarget.count({
        where: {
          claimId: claimTarget.claimId,
          status: { in: ["claimed", "running", "partial"] },
        },
      });
      await tx.youtubeWorkerClaim.update({
        where: { id: claimTarget.claimId },
        data: {
          status: openCount > 0 ? "running" : "done",
          totalClaimed: Number(totals._sum.claimedQuantity || 0),
          totalSuccess: Number(totals._sum.successCount || 0),
          totalFailed: Number(totals._sum.failedCount || 0),
        },
      });

      await tx.youtubeWorkerJobLog.create({
        data: {
          workerKey,
          orderId: claimTarget.orderId,
          targetId: claimTarget.targetId,
          serviceType: claimTarget.serviceType,
          targetKey: claimTarget.targetKey,
          action: "chunk_update",
          status: normalizedStatus,
          quotaDone: nextSuccess,
          quotaTotal: claimTarget.claimedQuantity,
          error: body.error || null,
          detail: {
            claimId: claimTarget.claimId,
            claimTargetId: claimTarget.id,
            successDelta,
            reportedSuccessCount: body.successCount ?? null,
            ignoredDuplicateOrInvalidSuccess: Math.max(0, successHistory.length - acceptedSuccessDelta),
            failedCount: nextFailed,
          } as Prisma.InputJsonValue,
        },
      });

      return { updatedClaimTarget, updatedTarget };
    });

    if ("notFound" in result) return NextResponse.json({ error: "Claim target not found" }, { status: 404 });
    if ("forbidden" in result) return NextResponse.json({ error: "Worker does not own this claim target" }, { status: 403 });

    const order = await recalculateYoutubeOrder(result.updatedTarget.orderId);
    return NextResponse.json({ ok: true, claimTarget: result.updatedClaimTarget, target: result.updatedTarget, order });
  } catch (error) {
    console.error("YouTube worker claim update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
