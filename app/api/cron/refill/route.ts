import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Refill Engine: creates replacement reviews for dropped/deleted ones during warranty
export async function POST(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find live reviews that might need checking (within warranty period)
    // In production: crawl each live review URL to verify it still exists
    // For MVP: handle explicitly dropped reviews that need refill
    const droppedItems = await db.reviewItem.findMany({
      where: {
        status: 'dropped',
        settled: true, // was previously live and settled
        campaign: {
          status: { in: ['active', 'completed'] },
          warrantyUntil: { gte: new Date() }
        }
      },
      include: {
        campaign: { include: { pricingTier: true } }
      },
      take: 50
    });

    let refillsCreated = 0;

    for (const item of droppedItems) {
      // Use maxRefills from pricingTier instead of hardcoded 3
      const maxRefills = item.campaign.pricingTier?.maxRefills ?? 3;
      if (item.refillCount >= maxRefills) continue;

      // Check if a refill item already exists and is still pending/active to avoid double-refill
      const existingRefill = await db.reviewItem.findFirst({
        where: {
          refillOfId: item.id,
          status: { notIn: ['dropped', 'expired'] }
        }
      });
      if (existingRefill) continue;
      try {
        // Create refill review item (no charge to client)
        const hour = Math.floor(Math.random() * (21 - 9 + 1)) + 9;
        const minute = Math.floor(Math.random() * 60);
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1);
        scheduledAt.setHours(hour, minute, 0, 0);

        await db.$transaction(async (tx) => {
          // Update original item's refill count
          await tx.reviewItem.update({
            where: { id: item.id },
            data: { refillCount: { increment: 1 } }
          });

          // Create new review item as refill
          await tx.reviewItem.create({
            data: {
              campaignId: item.campaignId,
              targetRating: item.targetRating,
              content: item.content,
              clientPrice: 0, // no charge for refill
              workerPayout: item.campaign.pricingTier.workerPayout, // still pay worker
              scheduledAt,
              status: 'pending',
              isRefill: true,
              refillOfId: item.id,
              refillCount: 0
            }
          });
        });

        refillsCreated++;
      } catch (err) {
        console.error(`Refill error for item ${item.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, checked: droppedItems.length, refillsCreated });
  } catch (error) {
    console.error("Refill engine error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
