import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalUsers,
      totalClients,
      totalWorkers,
      pendingWorkers,
      totalCampaigns,
      activeCampaigns,
      reviewStats,
      recentTransactions
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'client' } }),
      db.user.count({ where: { role: 'worker' } }),
      db.user.count({ where: { role: 'worker', workerStatus: 'pending' } }),
      db.campaign.count(),
      db.campaign.count({ where: { status: 'active' } }),
      db.reviewItem.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      db.transactionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true, email: true } } }
      })
    ]);

    const reviewStatusCounts = Object.fromEntries(
      reviewStats.map(s => [s.status, s._count.id])
    );

    return NextResponse.json({
      users: { total: totalUsers, clients: totalClients, workers: totalWorkers, pendingWorkers },
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      reviews: reviewStatusCounts,
      recentTransactions
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
