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
    const tab = searchParams.get('tab');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const workerId = searchParams.get('workerId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const now = new Date();
    const where: any = {};

    if (tab) {
      switch (tab) {
        case 'all':
          break;
        case 'inactive':
          where.status = 'pending';
          where.campaign = { status: { not: 'active' } };
          break;
        case 'queue':
          where.status = 'pending';
          where.scheduledAt = { gt: now };
          where.campaign = { status: 'active' };
          break;
        case 'waiting':
          where.status = 'pending';
          where.OR = [
            { scheduledAt: null },
            { scheduledAt: { lte: now } },
          ];
          where.campaign = { status: 'active' };
          break;
        case 'assigned':
          where.status = 'assigned';
          break;
        case 'pending_verify':
          where.status = 'pending_verify';
          break;
        case 'live':
          where.status = 'live';
          break;
        case 'dropped':
          where.status = 'dropped';
          break;
        case 'cancelled':
          where.status = 'cancelled';
          break;
        default:
          where.status = tab;
      }
    } else if (status) {
      where.status = status;
    } else {
      where.status = 'pending_verify';
    }

    if (workerId) where.assignedWorkerId = workerId;
    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
      if (dateTo) where.updatedAt.lte = new Date(dateTo + 'T23:59:59Z');
    }
    if (search) {
      const searchConditions = [
        { assignedWorker: { name: { contains: search, mode: 'insensitive' } } },
        { campaign: { mapLocation: { name: { contains: search, mode: 'insensitive' } } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [jobs, total] = await Promise.all([
      db.reviewItem.findMany({
        where,
        include: {
          campaign: { include: { mapLocation: { select: { name: true } }, client: { select: { name: true, email: true } } } },
          assignedWorker: { select: { name: true, email: true, trustScore: true } },
          assignedAccount: { select: { accountName: true, level: true } },
          pricingTier: { select: { level: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.reviewItem.count({ where })
    ]);

    return NextResponse.json({ jobs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin jobs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
