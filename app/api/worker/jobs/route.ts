import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const VALID_STATUSES = ['pending', 'assigned', 'pending_verify', 'verifying', 'holding', 'live', 'dropped', 'expired'] as const;
const HISTORY_STATUSES = ['pending_verify', 'verifying', 'holding', 'live', 'dropped', 'expired'] as const;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'worker' || session.user.workerStatus !== 'approved') {
      return NextResponse.json({ error: "Unauthorized or not approved" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    // History tab: all completed/reviewed/dropped jobs
    if (status === 'history') {
      const jobs = await db.reviewItem.findMany({
        where: {
          status: { in: HISTORY_STATUSES as unknown as any[] },
          assignedWorkerId: session.user.id
        },
        include: {
          campaign: { include: { mapLocation: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 100
      });
      return NextResponse.json({ jobs });
    }

    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    // For available (pending) jobs: filter by worker's accounts, level, and anti-reuse
    if (status === 'pending') {
      // Get worker's active accounts
      const workerAccounts = await db.workerAccount.findMany({
        where: {
          workerId: session.user.id,
          status: 'active',
          OR: [
            { nextAvailableAt: null },
            { nextAvailableAt: { lte: new Date() } }
          ]
        },
        include: {
          mapUsage: { select: { mapLocationId: true } }
        }
      });

      if (workerAccounts.length === 0) {
        return NextResponse.json({ jobs: [] });
      }

      // Collect map IDs that ALL active accounts have already used (intersection).
      // A location is only excluded when every eligible account has done a job there.
      // Using union would incorrectly hide jobs that other accounts could still take.
      let usedMapIds: Set<string>;
      if (workerAccounts.length === 1) {
        usedMapIds = new Set(workerAccounts[0].mapUsage.map(u => u.mapLocationId));
      } else {
        // Start with first account's used locations, then intersect with each subsequent account
        usedMapIds = new Set(workerAccounts[0].mapUsage.map(u => u.mapLocationId));
        for (let i = 1; i < workerAccounts.length; i++) {
          const accMapIds = new Set(workerAccounts[i].mapUsage.map(u => u.mapLocationId));
          for (const id of Array.from(usedMapIds)) {
            if (!accMapIds.has(id)) usedMapIds.delete(id);
          }
        }
      }

      // Compute worker's level range for tier matching
      const workerLevels = workerAccounts.map(a => a.level);
      const workerMinLevel = Math.min(...workerLevels);
      const workerMaxLevel = Math.max(...workerLevels);

      const jobs = await db.reviewItem.findMany({
        where: {
          status: 'pending',
          // Only show jobs whose scheduledAt has arrived ("Waiting" status)
          // This respects campaign.maxReviewsPerDay distribution
          scheduledAt: { lte: new Date() },
          // Tier-level matching: worker's highest account level must meet the tier's minimum requirement
          OR: [
            { pricingTierId: null },
            { pricingTier: { minAccountLevel: { lte: workerMaxLevel } } },
          ],
          campaign: {
            status: 'active',
            mapLocationId: usedMapIds.size > 0 ? { notIn: Array.from(usedMapIds) } : undefined,
            mapLocation: {
              OR: [
                { cooldownUntil: null },
                { cooldownUntil: { lte: new Date() } }
              ]
            }
          }
        },
        include: {
          pricingTier: { select: { level: true, name: true, minAccountLevel: true, maxAccountLevel: true } },
          campaign: {
            include: {
              mapLocation: true,
              pricingTier: { select: { level: true, name: true } }
            },
            // include campaign-level content/image hints
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 50
      });

      return NextResponse.json({ jobs });
    }

    // For worker's own active jobs (assigned)
    const jobs = await db.reviewItem.findMany({
      where: {
        status: status as any,
        assignedWorkerId: session.user.id
      },
      include: {
        campaign: {
          include: { mapLocation: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Fetch worker jobs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
