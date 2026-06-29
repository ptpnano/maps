import { db } from "@/lib/db";
import { authenticateYoutubeWorker, workerAuthResponse } from "@/lib/youtube-worker-auth";
import { completeOverdueYoutubeOrders, getYoutubeOrderTimeoutHours } from "@/lib/youtube-orders";
import { Prisma, YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const feedSchema = z.object({
  workerKey: z.string().min(3).max(120).optional(),
  serviceTypes: z.array(z.nativeEnum(YoutubeServiceType)).min(1).optional().default(["like"]),
  limitTargets: z.number().int().min(1).max(200).optional().default(50),
});

const ACTIVE_ORDER_STATUSES = ["queued", "running", "partial"] as const;

export async function POST(req: Request) {
  try {
    const parsed = feedSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid feed request", details: parsed.error.format() }, { status: 400 });
    }

    const auth = await authenticateYoutubeWorker(req, parsed.data.workerKey || null);
    if ("error" in auth) return workerAuthResponse(auth.error, auth.status);

    const now = new Date();
    const timeoutHours = await getYoutubeOrderTimeoutHours();
    const cutoff = new Date(now.getTime() - timeoutHours * 60 * 60 * 1000);
    await completeOverdueYoutubeOrders();
    await db.youtubeWorker.upsert({
      where: { workerKey: auth.workerKey },
      update: {
        status: "online",
        capabilities: parsed.data.serviceTypes,
        lastSeenAt: now,
      },
      create: {
        workerKey: auth.workerKey,
        status: "online",
        capabilities: parsed.data.serviceTypes,
        lastSeenAt: now,
      },
    });

    const candidates = await db.youtubeOrderTarget.findMany({
      where: {
        isPaused: false,
        serviceType: { in: parsed.data.serviceTypes },
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
      include: {
        order: {
          include: { serviceConfig: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: Math.max(parsed.data.limitTargets * 3, parsed.data.limitTargets),
    });

    const targets = candidates
      .filter((target) => Number(target.executionQuantity || 0) - Number(target.ytbQuotaDone || 0) > 0)
      .slice(0, parsed.data.limitTargets)
      .map((target) => ({
        serviceType: target.serviceType,
        targetKey: target.targetKey,
        targetUrl: target.targetUrl,
        config: target.order.serviceConfig.defaultConfig || {},
      }));

    await db.youtubeWorkerJobLog.create({
      data: {
        workerId: auth.worker?.id || null,
        workerKey: auth.workerKey,
        action: "targets_feed",
        status: "ok",
        quotaDone: targets.length,
        detail: {
          serviceTypes: parsed.data.serviceTypes,
          limitTargets: parsed.data.limitTargets,
          returnedTargets: targets.length,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      targets,
      refreshAfterSeconds: 60,
    });
  } catch (error) {
    console.error("YouTube worker targets feed error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
