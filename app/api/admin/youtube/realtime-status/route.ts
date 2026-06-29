import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = Date.now();
    const activeAfter = new Date(now - 2 * 60 * 1000);
    const workers = await db.youtubeWorker.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 20,
      include: {
        jobLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    const activeWorkers = workers.filter((worker) => worker.lastSeenAt >= activeAfter && worker.status !== "offline");
    const queuedTargets = await db.youtubeOrderTarget.count({
      where: {
        order: { status: { in: ["queued", "running", "partial"] } },
        OR: [
          { ytbStatus: null },
          { ytbStatus: { in: ["queued", "claimed", "running", "active"] } },
        ],
      },
    });
    const jobStats = await db.youtubeWorkerJobLog.groupBy({
      by: ["workerKey", "status"],
      where: { createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
      _count: { _all: true },
    });

    return NextResponse.json({
      ok: activeWorkers.length > 0,
      status: activeWorkers.length > 0 ? "online" : "no_active_worker",
      message: activeWorkers.length > 0
        ? "Worker YouTube dang heartbeat ve Maps"
        : "Chua thay worker YouTube heartbeat ve Maps trong 2 phut gan day",
      activeClients: activeWorkers.length,
      totalClients: workers.length,
      queuedTargets,
      jobStats,
      clients: workers.map((worker) => ({
        client_id: worker.workerKey,
        label: worker.label,
        status: worker.status,
        apiKeyPrefix: worker.apiKeyPrefix,
        accounts: Array.isArray(worker.capabilities) ? worker.capabilities.length : 0,
        capabilities: worker.capabilities,
        last_seen_at: Math.floor(worker.lastSeenAt.getTime() / 1000),
        recentJobs: worker.jobLogs,
      })),
    });
  } catch (error) {
    console.error("Admin YouTube worker status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
