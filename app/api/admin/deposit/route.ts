import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const depositSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  amount: z.number().positive()
}).refine(data => data.userId || data.userEmail, {
  message: "userId or userEmail is required"
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = depositSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { userId, userEmail, amount } = result.data;

    const targetUser = await db.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail },
      include: { wallet: true }
    });

    if (!targetUser || !targetUser.wallet || targetUser.role !== 'client') {
      return NextResponse.json({ error: "Client not found or invalid" }, { status: 404 });
    }

    const wallet = targetUser.wallet;

    const txResult = await db.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: amount }
        }
      });

      const idempotencyKey = `admin_deposit_${randomUUID()}`;

      await tx.transactionLog.create({
        data: {
          userId: targetUser.id,
          walletId: wallet.id,
          type: 'deposit',
          oldBalance: wallet.availableBalance,
          newBalance: updatedWallet.availableBalance,
          changeAmount: amount,
          reason: `Admin Deposit by ${session.user.email}`,
          performedById: session.user.id,
          idempotencyKey
        }
      });

      return updatedWallet;
    });

    return NextResponse.json({ success: true, balance: txResult.availableBalance });
  } catch (error) {
    console.error("Admin deposit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
