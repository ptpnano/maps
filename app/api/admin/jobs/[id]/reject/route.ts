import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const result = await db.$transaction(async (tx) => {
      const job = await tx.reviewItem.findUnique({
        where: { id },
        include: {
          campaign: {
            include: { pricingTier: true }
          },
          assignedWorker: true,
        }
      });

      if (!job || job.status !== 'pending_verify') {
        throw new Error("Job not found or not in pending_verify state");
      }

      // 1. Mark as dropped
      await tx.reviewItem.update({
        where: { id },
        data: { status: 'dropped' }
      });

      // 2. Decrement worker trust score (floor 0)
      if (job.assignedWorkerId) {
        const worker = await tx.user.findUnique({
          where: { id: job.assignedWorkerId },
          select: { trustScore: true }
        });
        await tx.user.update({
          where: { id: job.assignedWorkerId },
          data: { trustScore: Math.max(0, (worker?.trustScore ?? 0) - 30) }
        });
      }

      // 3. Cleanup AccountMapUsage so account can be reused
      if (job.assignedAccountId && job.campaign.mapLocationId) {
        await tx.accountMapUsage.deleteMany({
          where: {
            accountId: job.assignedAccountId,
            mapLocationId: job.campaign.mapLocationId,
          }
        });
      }

      // 4. Create refill if within warranty and refill count allows
      const now = new Date();
      const withinWarranty = job.campaign.warrantyUntil && job.campaign.warrantyUntil > now;
      const canRefill = job.refillCount < (job.campaign.pricingTier?.maxRefills ?? 3);

      if (withinWarranty && canRefill) {
        await tx.reviewItem.create({
          data: {
            campaignId: job.campaignId,
            targetRating: job.targetRating,
            clientPrice: job.clientPrice,
            workerPayout: job.workerPayout,
            status: 'pending',
            isRefill: true,
            refillOfId: job.id,
            refillCount: job.refillCount + 1,
          }
        });
      }

      return { dropped: true, refillCreated: !!(withinWarranty && canRefill) };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("Reject job error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const isClientError = message.includes("not found") || message.includes("not in");
    return NextResponse.json(
      { error: isClientError ? message : "Internal Server Error" },
      { status: isClientError ? 400 : 500 }
    );
  }
}
