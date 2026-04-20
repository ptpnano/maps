import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Settlement Engine: moves holding reviews to live after 7-day hold period
// Call via Vercel Cron or external scheduler with CRON_SECRET header
export async function POST(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all reviews in holding that have passed their release date
    const readyItems = await db.reviewItem.findMany({
      where: {
        status: 'holding',
        releaseAt: { lte: now },
        settled: false
      },
      include: {
        campaign: true,
        assignedWorker: { include: { wallet: true } }
      },
      take: 100 // batch size
    });

    let settledCount = 0;
    const errors: string[] = [];

    for (const item of readyItems) {
      try {
        await db.$transaction(async (tx) => {
          // Double-check inside transaction
          const fresh = await tx.reviewItem.findUnique({ where: { id: item.id } });
          if (!fresh || fresh.settled || fresh.status !== 'holding') return;

          const clientWallet = await tx.wallet.findUnique({
            where: { userId: item.campaign.clientId }
          });
          if (!clientWallet) throw new Error(`No client wallet for campaign ${item.campaignId}`);
          if (!item.assignedWorker?.wallet) throw new Error(`No worker wallet for item ${item.id}`);

          // 1. Mark review as live + settled
          await tx.reviewItem.update({
            where: { id: item.id },
            data: {
              status: 'live',
              settled: true,
              settledAt: now
            }
          });

          // 2. Deduct from client frozen balance
          const updatedClientWallet = await tx.wallet.update({
            where: { id: clientWallet.id },
            data: {
              frozenBalance: { decrement: item.clientPrice },
              totalSpent: { increment: item.clientPrice }
            }
          });

          // 3. Pay worker
          const updatedWorkerWallet = await tx.wallet.update({
            where: { id: item.assignedWorker.wallet.id },
            data: {
              availableBalance: { increment: item.workerPayout },
              totalEarned: { increment: item.workerPayout }
            }
          });

          // 4. Update campaign settled amount
          await tx.campaign.update({
            where: { id: item.campaignId },
            data: {
              frozenAmount: { decrement: item.clientPrice },
              settledAmount: { increment: item.clientPrice }
            }
          });

          // 5. Transaction logs
          const clientTxKey = `settle_client_${item.id}`;
          await tx.transactionLog.create({
            data: {
              userId: item.campaign.clientId,
              walletId: clientWallet.id,
              type: 'payout_client',
              oldBalance: clientWallet.frozenBalance,
              newBalance: updatedClientWallet.frozenBalance,
              changeAmount: -item.clientPrice,  // negative: frozen balance decreased
              reason: `Thanh toán review #${item.id.slice(0, 8)}`,
              referenceType: 'review',
              referenceId: item.id,
              idempotencyKey: clientTxKey
            }
          });

          const workerTxKey = `settle_worker_${item.id}`;
          await tx.transactionLog.create({
            data: {
              userId: item.assignedWorker.id,
              walletId: item.assignedWorker.wallet.id,
              type: 'payout_worker',
              oldBalance: item.assignedWorker.wallet.availableBalance,
              newBalance: updatedWorkerWallet.availableBalance,
              changeAmount: item.workerPayout,
              reason: `Tiền công review #${item.id.slice(0, 8)}`,
              referenceType: 'review',
              referenceId: item.id,
              idempotencyKey: workerTxKey
            }
          });

          // 6. Adjust worker trust score (+10 for survived)
          await tx.user.update({
            where: { id: item.assignedWorker.id },
            data: { trustScore: { increment: 10 } }
          });

          // 7. Check campaign completion
          const remainingCount = await tx.reviewItem.count({
            where: {
              campaignId: item.campaignId,
              status: { notIn: ['live', 'dropped', 'expired'] }
            }
          });

          if (remainingCount === 0) {
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { status: 'completed' }
            });
          }
        });

        settledCount++;
      } catch (err: any) {
        errors.push(`Item ${item.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: readyItems.length,
      settled: settledCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Settlement engine error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
