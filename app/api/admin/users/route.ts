import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const where: any = {};
    if (role) where.role = role;
    if (status) where.workerStatus = status;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, phone: true, role: true,
          workerStatus: true, trustScore: true, isActive: true,
          createdAt: true,
          wallet: { select: { availableBalance: true, frozenBalance: true, totalEarned: true, totalSpent: true } },
          _count: { select: { campaigns: true, assignedReviewItems: true, workerAccounts: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.user.count({ where })
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
