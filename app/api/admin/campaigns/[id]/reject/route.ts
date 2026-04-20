import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// POST: Admin rejects a pending campaign → cancelled + refund frozen amount
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Bị admin từ chối';

    const result = await db.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id },
        select: { id: true, status: true, clientId: true, frozenAmount: true, totalReviews: true }
      });

      if (!campaign) throw new Error("NOT_FOUND");
      if (campaign.status !== 'pending') throw new Error("INVALID_STATUS");

      const refundAmount = campaign.frozenAmount.toNumber();

      // Cancel campaign
      await tx.campaign.update({
        where: { id },
        data: { status: 'cancelled', frozenAmount: 0 }
      });

      // Cancel all review items
      await tx.reviewItem.updateMany({
        where: { campaignId: id, status: 'pending' },
        data: { status: 'dropped' }
      });

      // Refund to wallet
      if (refundAmount > 0) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: campaign.clientId }
        });

        if (wallet) {
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              frozenBalance: { decrement: refundAmount },
              availableBalance: { increment: refundAmount }
            }
          });

          await tx.transactionLog.create({
            data: {
              userId: campaign.clientId,
              walletId: wallet.id,
              type: 'unfreeze',
              oldBalance: wallet.availableBalance,
              newBalance: updatedWallet.availableBalance,
              changeAmount: refundAmount,
              reason: `Refund: ${reason}`,
              referenceType: 'campaign',
              referenceId: campaign.id,
              idempotencyKey: `reject_campaign_${randomUUID()}`
            }
          });
        }
      }

      return campaign;
    });

    return NextResponse.json({ success: true, campaignId: result.id });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (error.message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Chỉ có thể từ chối chiến dịch đang chờ duyệt" }, { status: 400 });
    }
    console.error("Admin reject campaign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
