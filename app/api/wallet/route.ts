import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallet = await db.wallet.findUnique({
      where: { userId: session.user.id }
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      availableBalance: wallet.availableBalance,
      frozenBalance: wallet.frozenBalance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      totalWithdrawn: wallet.totalWithdrawn,
    });
  } catch (error) {
    console.error("Fetch wallet error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
