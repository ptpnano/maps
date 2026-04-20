import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: list approved workers with their active accounts (for admin dispatch modal)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workers = await db.user.findMany({
      where: { role: 'worker', workerStatus: 'approved' },
      select: {
        id: true,
        name: true,
        email: true,
        trustScore: true,
        workerAccounts: {
          where: { status: 'active' },
          select: { id: true, accountName: true, level: true, status: true },
          orderBy: { level: 'desc' },
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ workers });
  } catch (error) {
    console.error("Admin workers list error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
