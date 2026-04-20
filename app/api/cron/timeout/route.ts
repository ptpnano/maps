import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all assigned jobs past their claim deadline
    const expiredJobs = await db.reviewItem.findMany({
      where: {
        status: 'assigned',
        claimDeadline: { lt: now },
      },
      select: { id: true, assignedAccountId: true, campaignId: true },
    });

    if (expiredJobs.length === 0) {
      return NextResponse.json({ message: "No expired jobs", count: 0 });
    }

    // Get campaign map location IDs for cleaning up AccountMapUsage
    const campaignIds = [...new Set(expiredJobs.map(j => j.campaignId))];
    const campaigns = await db.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, mapLocationId: true },
    });
    const campaignMapLocation = new Map(campaigns.map(c => [c.id, c.mapLocationId]));

    // Reset each expired job
    let resetCount = 0;
    for (const job of expiredJobs) {
      await db.reviewItem.updateMany({
        where: { id: job.id, status: 'assigned' },
        data: {
          status: 'pending',
          assignedWorkerId: null,
          assignedAccountId: null,
          claimedAt: null,
          claimDeadline: null,
        },
      });

      // Clean up AccountMapUsage so the account can be used again
      if (job.assignedAccountId) {
        const mapLocationId = campaignMapLocation.get(job.campaignId);
        if (mapLocationId) {
          await db.accountMapUsage.deleteMany({
            where: {
              accountId: job.assignedAccountId,
              mapLocationId,
            },
          });
        }
      }

      resetCount++;
    }

    return NextResponse.json({ message: `Reset ${resetCount} expired jobs`, count: resetCount });
  } catch (error) {
    console.error("Job timeout cron error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
