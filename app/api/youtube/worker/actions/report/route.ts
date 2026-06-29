import { db } from "@/lib/db";
import { completeOverdueYoutubeOrders, getYoutubeOrderTimeoutHours, recalculateYoutubeOrder } from "@/lib/youtube-orders";
import { authenticateYoutubeWorker, workerAuthResponse } from "@/lib/youtube-worker-auth";
import { Prisma, YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const resultSchema = z.object({
  serviceType: z.nativeEnum(YoutubeServiceType),
  targetKey: z.string().min(1).max(255),
  status: z.string().min(1).max(50),
  ip: z.string().max(100).optional().nullable(),
  actedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const reportSchema = z.object({
  workerKey: z.string().min(3).max(120).optional(),
  gmail: z.string().email().max(255),
  results: z.array(resultSchema).min(1).max(500),
});

const ACTIVE_ORDER_STATUSES = ["queued", "running", "partial"] as const;

function parseActedAt(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeGmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeStatus(value: string) {
  const status = value.trim().toLowerCase();
  return status || "success";
}

export async function POST(req: Request) {
  try {
    const parsed = reportSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action report", details: parsed.error.format() }, { status: 400 });
    }

    const auth = await authenticateYoutubeWorker(req, parsed.data.workerKey || null);
    if ("error" in auth) return workerAuthResponse(auth.error, auth.status);

    const workerKey = auth.workerKey;
    const gmail = normalizeGmail(parsed.data.gmail);
    const now = new Date();
    const timeoutHours = await getYoutubeOrderTimeoutHours();
    const cutoff = new Date(now.getTime() - timeoutHours * 60 * 60 * 1000);
    await completeOverdueYoutubeOrders();

    const report = await db.$transaction(async (tx) => {
      await tx.youtubeWorker.upsert({
        where: { workerKey },
        update: {
          status: "online",
          capabilities: Array.from(new Set(parsed.data.results.map((row) => row.serviceType))),
          lastSeenAt: now,
        },
        create: {
          workerKey,
          status: "online",
          capabilities: Array.from(new Set(parsed.data.results.map((row) => row.serviceType))),
          lastSeenAt: now,
        },
      });

      const accepted: any[] = [];
      const ignored: any[] = [];
      const affectedOrderIds = new Set<string>();

      for (const row of parsed.data.results) {
        const status = normalizeStatus(row.status);
        const target = await tx.youtubeOrderTarget.findFirst({
          where: {
            serviceType: row.serviceType,
            targetKey: row.targetKey,
            isPaused: false,
            ytbQuotaDone: { lt: db.youtubeOrderTarget.fields.executionQuantity },
            order: {
              status: { in: [...ACTIVE_ORDER_STATUSES] },
              approvedAt: { gte: cutoff },
              serviceConfig: { isActive: true },
            },
            OR: [
              { ytbStatus: null },
              { ytbStatus: { notIn: ["done", "completed"] } },
            ],
          },
          include: { order: true },
          orderBy: { createdAt: "asc" },
        });

        if (!target) {
          ignored.push({
            serviceType: row.serviceType,
            targetKey: row.targetKey,
            status,
            reason: "target_not_active_or_quota_done",
          });
          continue;
        }

        affectedOrderIds.add(target.orderId);
        const actedAt = parseActedAt(row.actedAt);

        if (status === "success") {
          const created = await tx.youtubeWorkerActionHistory.createMany({
            data: [{
              orderId: target.orderId,
              targetId: target.id,
              workerKey,
              serviceType: row.serviceType,
              targetKey: row.targetKey,
              gmail,
              ip: row.ip || null,
              status: "success",
              actedAt,
              metadata: row.metadata as Prisma.InputJsonValue,
            }],
            skipDuplicates: true,
          });

          if (created.count > 0) {
            const nextDone = Math.min(Number(target.executionQuantity || 0), Number(target.ytbQuotaDone || 0) + 1);
            const targetDone = nextDone >= Number(target.executionQuantity || 0);

            await tx.youtubeOrderTarget.update({
              where: { id: target.id },
              data: {
                deliveredQuantity: Math.min(nextDone, Number(target.quantity || 0)),
                ytbQuotaDone: nextDone,
                ytbQuotaTotal: target.executionQuantity,
                ytbStatus: targetDone ? "done" : "active",
                ytbLastError: null,
                ytbLastDetail: {
                  workerKey,
                  gmail,
                  status: "success",
                  actedAt: actedAt.toISOString(),
                  reportMode: "action_feed",
                } as Prisma.InputJsonValue,
                lastSyncedAt: now,
              },
            });
            await tx.youtubeOrder.update({
              where: { id: target.orderId },
              data: { status: "running", ytbLastSyncAt: now },
            });
            accepted.push({
              serviceType: row.serviceType,
              targetKey: row.targetKey,
              status: "success",
              counted: true,
              targetId: target.id,
              quotaDone: nextDone,
              quotaTotal: target.executionQuantity,
            });
          } else {
            ignored.push({
              serviceType: row.serviceType,
              targetKey: row.targetKey,
              status: "success",
              reason: "duplicate_gmail_target",
            });
          }
        } else {
          await tx.youtubeWorkerActionHistory.create({
            data: {
              orderId: target.orderId,
              targetId: target.id,
              workerKey,
              serviceType: row.serviceType,
              targetKey: row.targetKey,
              gmail,
              ip: row.ip || null,
              status,
              actedAt,
              metadata: {
                ...row.metadata,
                countedForQuota: false,
              } as Prisma.InputJsonValue,
            },
          });
          accepted.push({
            serviceType: row.serviceType,
            targetKey: row.targetKey,
            status,
            counted: false,
            targetId: target.id,
          });
        }
      }

      await tx.youtubeWorkerJobLog.create({
        data: {
          workerId: auth.worker?.id || null,
          workerKey,
          action: "actions_report",
          status: "ok",
          quotaDone: accepted.filter((row) => row.counted).length,
          error: ignored.length ? `${ignored.length} result(s) ignored` : null,
          detail: {
            gmail,
            resultCount: parsed.data.results.length,
            acceptedCount: accepted.length,
            countedSuccessCount: accepted.filter((row) => row.counted).length,
            ignored,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        accepted,
        ignored,
        affectedOrderIds: Array.from(affectedOrderIds),
      };
    });

    const orders = [];
    for (const orderId of report.affectedOrderIds) {
      orders.push(await recalculateYoutubeOrder(orderId));
    }

    return NextResponse.json({
      ok: true,
      workerKey,
      gmail,
      accepted: report.accepted,
      ignored: report.ignored,
      orders: orders.map((order) => order && { id: order.id, status: order.status }),
    });
  } catch (error) {
    console.error("YouTube worker actions report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
