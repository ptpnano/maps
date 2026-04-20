import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const withdrawSchema = z.object({
  amount: z.number().positive().min(50000, 'Số tiền rút tối thiểu là 50,000đ'),
  bankName: z.string().min(1),
  bankAccount: z.string().min(1),
  accountHolder: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'worker') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = withdrawSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 });
    }

    const { amount, bankName, bankAccount, accountHolder } = result.data;

    const withdrawal = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: session.user.id } });
      if (!wallet || wallet.availableBalance.toNumber() < amount) {
        throw new Error("Insufficient balance");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: amount },
          totalWithdrawn: { increment: amount }
        }
      });

      const txLog = await tx.transactionLog.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          type: 'withdrawal',
          oldBalance: wallet.availableBalance,
          newBalance: updatedWallet.availableBalance,
          changeAmount: -amount,
          reason: `Rút tiền: ${bankName} - ${bankAccount} - ${accountHolder}`,
          idempotencyKey: `withdraw_${randomUUID()}`
        }
      });

      return txLog;
    });

    return NextResponse.json({ success: true, transaction: withdrawal });
  } catch (error: any) {
    if (error.message === "Insufficient balance") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
