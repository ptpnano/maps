import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const status = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const where: any = {};
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.scannedAt = {};
    if (dateFrom) where.scannedAt.gte = new Date(dateFrom);
    if (dateTo) where.scannedAt.lte = new Date(dateTo + 'T23:59:59Z');
  }

  const [logs, total] = await Promise.all([
    db.scanLog.findMany({
      where,
      include: {
        reviewItem: {
          select: {
            id: true,
            publishedUrl: true,
            targetRating: true,
            status: true,
            campaign: { select: { mapLocation: { select: { name: true } } } },
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.scanLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, totalPages: Math.ceil(total / limit), page });
}
