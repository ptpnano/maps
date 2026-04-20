import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Called by cron scheduler: GET /api/cron/auto-assign
// Set env CRON_SECRET and pass as x-cron-secret header
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
    if (!config || config.dispatchMode !== 'auto') {
      return NextResponse.json({ skipped: true, reason: 'Auto-assign is disabled' });
    }

    const algorithm = config.autoAssignAlgorithm || 'trust_score';

    // Find pending jobs from active campaigns
    const pendingJobs = await db.reviewItem.findMany({
      where: {
        status: 'pending',
        assignedWorkerId: null,
        scheduledAt: { lte: new Date() },
        campaign: { status: 'active' }
      },
      include: {
        campaign: { select: { mapLocationId: true } },
        pricingTier: { select: { minAccountLevel: true, maxAccountLevel: true } }
      },
      take: 100
    });

    if (pendingJobs.length === 0) {
      return NextResponse.json({ assigned: 0, message: 'No pending jobs' });
    }

    // Fetch eligible workers
    const workers = await db.user.findMany({
      where: { role: 'worker', workerStatus: 'approved', isActive: true },
      include: {
        workerAccounts: {
          where: { status: 'active' },
          include: { mapUsage: { select: { mapLocationId: true } } }
        },
        _count: { select: { assignedJobs: { where: { status: { in: ['in_progress', 'pending_verify'] } } } } }
      }
    });

    let assigned = 0;

    for (const job of pendingJobs) {
      const minLevel = job.pricingTier?.minAccountLevel ?? 1;
      const maxLevel = job.pricingTier?.maxAccountLevel ?? 10;
      const mapLocId = job.campaign.mapLocationId;

      // Filter eligible workers who have an account at the right level and haven't reviewed this location
      const eligibleWorkers = workers.filter(worker => {
        return worker.workerAccounts.some(acc => {
          const levelOk = acc.level >= minLevel && acc.level <= maxLevel;
          const notUsed = !acc.mapUsage.some(u => u.mapLocationId === mapLocId);
          return levelOk && notUsed;
        });
      });

      if (eligibleWorkers.length === 0) continue;

      // Sort by algorithm
      let sorted = [...eligibleWorkers];
      if (algorithm === 'trust_score') {
        sorted.sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));
      } else if (algorithm === 'least_jobs') {
        sorted.sort((a, b) => (a._count.assignedJobs) - (b._count.assignedJobs));
      } else if (algorithm === 'highest_level') {
        sorted.sort((a, b) => {
          const aMax = Math.max(...a.workerAccounts.map(acc => acc.level));
          const bMax = Math.max(...b.workerAccounts.map(acc => acc.level));
          return bMax - aMax;
        });
      }
      // fifo: no specific sort needed (default order by createdAt)

      const chosen = sorted[0];
      // Pick the best account for this job
      const chosenAccount = chosen.workerAccounts
        .filter(acc => {
          const levelOk = acc.level >= minLevel && acc.level <= maxLevel;
          const notUsed = !acc.mapUsage.some(u => u.mapLocationId === mapLocId);
          return levelOk && notUsed;
        })
        .sort((a, b) => b.level - a.level)[0];

      if (!chosenAccount) continue;

      try {
        await db.$transaction(async (tx) => {
          await tx.reviewItem.update({
            where: { id: job.id, status: 'pending' },
            data: {
              status: 'in_progress',
              assignedWorkerId: chosen.id,
              assignedAccountId: chosenAccount.id,
              assignedAt: new Date(),
              expiresAt: new Date(Date.now() + (config.jobTimeoutMinutes || 30) * 60 * 1000)
            }
          });

          await tx.accountMapUsage.upsert({
            where: { accountId_mapLocationId: { accountId: chosenAccount.id, mapLocationId: mapLocId } },
            create: { accountId: chosenAccount.id, mapLocationId: mapLocId },
            update: {}
          });

          await tx.notification.create({
            data: {
              userId: chosen.id,
              type: 'job_assigned',
              title: 'Có việc mới được phân bổ cho bạn',
              message: `Bạn được tự động phân bổ một công việc review. Vui lòng vào mục Công việc để xử lý.`
            }
          });
        });
        assigned++;
      } catch {
        // Job may have been claimed concurrently, skip
      }
    }

    return NextResponse.json({ success: true, assigned, total: pendingJobs.length });
  } catch (error) {
    console.error("Auto-assign cron error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
