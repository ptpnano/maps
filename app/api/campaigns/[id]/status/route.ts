import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const statusSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel'])
});

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = statusSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { action } = result.data;
    const { id } = params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { reviewItems: { select: { id: true, status: true, clientPrice: true } } }
    });

    if (!campaign || campaign.clientId !== session.user.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (action === 'pause') {
      if (campaign.status !== 'active') {
        return NextResponse.json({ error: "Can only pause active campaigns" }, { status: 400 });
      }
      await db.campaign.update({ where: { id }, data: { status: 'paused' } });
    } else if (action === 'resume') {
      if (campaign.status !== 'paused') {
        return NextResponse.json({ error: "Can only resume paused campaigns" }, { status: 400 });
      }
      await db.campaign.update({ where: { id }, data: { status: 'active' } });
    } else if (action === 'cancel') {
      if (!['active', 'paused', 'pending'].includes(campaign.status)) {
        return NextResponse.json({ error: "Cannot cancel this campaign" }, { status: 400 });
      }

      // Refund unprocessed items (pending, assigned, pending_verify, verifying, holding)
      await db.$transaction(async (tx) => {
        const unprocessedItems = campaign.reviewItems.filter(
          item => ['pending', 'assigned', 'pending_verify', 'verifying', 'holding'].includes(item.status)
        );

        const refundAmount = unprocessedItems.reduce(
          (sum, item) => sum + Number(item.clientPrice), 0
        );

        // Cancel campaign
        await tx.campaign.update({
          where: { id },
          data: { status: 'cancelled' }
        });

        // Cancel unprocessed items (mark as cancelled, not dropped)
        if (unprocessedItems.length > 0) {
          await tx.reviewItem.updateMany({
            where: {
              id: { in: unprocessedItems.map(i => i.id) },
              status: { in: ['pending', 'assigned', 'pending_verify', 'verifying', 'holding'] }
            },
            data: { status: 'cancelled' }
          });
        }

        if (refundAmount > 0) {
          // Refund to wallet
          const wallet = await tx.wallet.findUnique({ where: { userId: session.user.id } });
          if (!wallet) throw new Error("Wallet not found");

          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              availableBalance: { increment: refundAmount },
              frozenBalance: { decrement: refundAmount }
            }
          });

          await tx.campaign.update({
            where: { id },
            data: { frozenAmount: { decrement: refundAmount } }
          });

          await tx.transactionLog.create({
            data: {
              userId: session.user.id,
              walletId: wallet.id,
              type: 'refund',
              oldBalance: wallet.availableBalance,
              newBalance: updatedWallet.availableBalance,
              changeAmount: refundAmount,
              reason: `Hoàn tiền hủy chiến dịch`,
              referenceType: 'campaign',
              referenceId: id,
              idempotencyKey: `refund_cancel_${id}_${randomUUID()}`
            }
          });
        }
      });
    }

    const updated = await db.campaign.findUnique({ where: { id } });
    return NextResponse.json({ success: true, campaign: updated });
  } catch (error) {
    console.error("Campaign status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
