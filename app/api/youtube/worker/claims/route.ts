import { db } from "@/lib/db";
import { authenticateYoutubeWorker, workerAuthResponse } from "@/lib/youtube-worker-auth";
import { completeOverdueYoutubeOrders, getYoutubeOrderTimeoutHours } from "@/lib/youtube-orders";
import { Prisma, YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const claimSchema = z.object({
  workerKey: z.string().min(3).max(120).optional(),
  serviceTypes: z.array(z.nativeEnum(YoutubeServiceType)).optional().default(["like", "view", "comment", "sub"]),
  limitTargets: z.number().int().min(1).max(50).optional().default(10),
  maxQuantityPerTarget: z.number().int().min(1).max(10000).optional().default(50),
  totalCapacity: z.number().int().min(1).max(100000).optional().default(200),
  leaseSeconds: z.number().int().min(60).max(86400).optional().default(600),
});

const ACTIVE_CLAIM_STATUSES = ["claimed", "running"];

async function claimChunks(req: Request) {
  const body = claimSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid claim request", details: body.error.format() }, { status: 400 });
  }

  const auth = await authenticateYoutubeWorker(req, body.data.workerKey || null);
  if ("error" in auth) return workerAuthResponse(auth.error, auth.status);
  const workerKey = auth.workerKey;

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + body.data.leaseSeconds * 1000);
  const timeoutHours = await getYoutubeOrderTimeoutHours();
  const cutoff = new Date(now.getTime() - timeoutHours * 60 * 60 * 1000);
  await completeOverdueYoutubeOrders();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await db.$transaction(async (tx) => {
        const worker = await tx.youtubeWorker.upsert({
          where: { workerKey },
          update: {
            status: "online",
            capabilities: body.data.serviceTypes,
            lastSeenAt: now,
          },
          create: {
            workerKey,
            status: "online",
            capabilities: body.data.serviceTypes,
            lastSeenAt: now,
          },
        });

        await tx.youtubeWorkerClaimTarget.updateMany({
          where: {
            status: { in: ACTIVE_CLAIM_STATUSES },
            leaseUntil: { lt: now },
          },
          data: { status: "expired" },
        });

        const candidates = await tx.youtubeOrderTarget.findMany({
          where: {
            isPaused: false,
            serviceType: { in: body.data.serviceTypes },
            order: {
              status: { in: ["queued", "running", "partial"] },
              approvedAt: { gte: cutoff },
              serviceConfig: { isActive: true },
            },
            OR: [
              { ytbStatus: null },
              { ytbStatus: { notIn: ["done", "completed"] } },
            ],
          },
          include: { order: { include: { serviceConfig: true } } },
          orderBy: { createdAt: "asc" },
          take: Math.max(body.data.limitTargets * 5, body.data.limitTargets),
        });

        const selected: Array<{
          target: (typeof candidates)[number];
          claimQuantity: number;
          activeReserved: number;
        }> = [];
        let remainingCapacity = body.data.totalCapacity;

        for (const target of candidates) {
          if (selected.length >= body.data.limitTargets || remainingCapacity <= 0) break;

          const active = await tx.youtubeWorkerClaimTarget.aggregate({
            where: {
              targetId: target.id,
              status: { in: ACTIVE_CLAIM_STATUSES },
              leaseUntil: { gt: now },
            },
            _sum: { claimedQuantity: true, successCount: true },
          });
          const activeReserved = Math.max(0, Number(active._sum.claimedQuantity || 0) - Number(active._sum.successCount || 0));
          const available = Number(target.executionQuantity || 0) - Number(target.ytbQuotaDone || 0) - activeReserved;
          if (available <= 0) continue;

          selected.push({
            target,
            activeReserved,
            claimQuantity: Math.min(available, body.data.maxQuantityPerTarget, remainingCapacity),
          });
          remainingCapacity -= selected[selected.length - 1].claimQuantity;
        }

        if (selected.length === 0) return { claimId: null, targets: [] as any[] };

        const claim = await tx.youtubeWorkerClaim.create({
          data: {
            workerId: worker.id,
            workerKey,
            status: "claimed",
            leaseUntil,
            totalClaimed: selected.reduce((sum, row) => sum + row.claimQuantity, 0),
            metadata: {
              serviceTypes: body.data.serviceTypes,
              limitTargets: body.data.limitTargets,
              maxQuantityPerTarget: body.data.maxQuantityPerTarget,
              totalCapacity: body.data.totalCapacity,
              leaseSeconds: body.data.leaseSeconds,
            } as Prisma.InputJsonValue,
          },
        });

        const out = [];
        for (const row of selected) {
          const claimTarget = await tx.youtubeWorkerClaimTarget.create({
            data: {
              claimId: claim.id,
              workerKey,
              orderId: row.target.orderId,
              targetId: row.target.id,
              serviceType: row.target.serviceType,
              targetKey: row.target.targetKey,
              targetUrl: row.target.targetUrl,
              status: "claimed",
              claimedQuantity: row.claimQuantity,
              leaseUntil,
              detail: {
                activeReservedBeforeClaim: row.activeReserved,
                claimedAt: now.toISOString(),
              } as Prisma.InputJsonValue,
            },
          });

          await tx.youtubeOrderTarget.update({
            where: { id: row.target.id },
            data: {
              ytbStatus: "active",
              ytbQuotaTotal: row.target.executionQuantity,
              ytbLastError: null,
              lastSyncedAt: now,
            },
          });
          await tx.youtubeOrder.update({
            where: { id: row.target.orderId },
            data: { status: "running", ytbLastSyncAt: now },
          });
          await tx.youtubeWorkerJobLog.create({
            data: {
              workerId: worker.id,
              workerKey,
              orderId: row.target.orderId,
              targetId: row.target.id,
              serviceType: row.target.serviceType,
              targetKey: row.target.targetKey,
              action: "chunk_claim",
              status: "claimed",
              quotaDone: row.claimQuantity,
              quotaTotal: row.target.executionQuantity,
              detail: { claimId: claim.id, claimTargetId: claimTarget.id } as Prisma.InputJsonValue,
            },
          });

          out.push({
            claimTargetId: claimTarget.id,
            targetId: row.target.id,
            orderId: row.target.orderId,
            serviceType: row.target.serviceType,
            targetKey: row.target.targetKey,
            targetUrl: row.target.targetUrl,
            claimQuantity: row.claimQuantity,
            quotaDone: row.target.ytbQuotaDone,
            quotaTotal: row.target.executionQuantity,
            comments: row.target.order.commentLines,
            allowDuplicateComments: row.target.order.allowDuplicateComments,
            config: row.target.order.serviceConfig.defaultConfig || {},
            leaseUntil: leaseUntil.toISOString(),
          });
        }

        return { claimId: claim.id, targets: out };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return NextResponse.json(result);
    } catch (error: any) {
      if (error?.code !== "P2034" || attempt === 2) throw error;
    }
  }

  return NextResponse.json({ claimId: null, targets: [] });
}

export async function POST(req: Request) {
  try {
    return await claimChunks(req);
  } catch (error) {
    console.error("YouTube worker claim error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
