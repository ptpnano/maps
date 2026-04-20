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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { mapLocation: { name: { contains: search, mode: 'insensitive' } } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true } },
          mapLocation: { select: { name: true, googleMapsUrl: true } },
          pricingTier: { select: { level: true, name: true } },
          tierItems: { include: { pricingTier: { select: { level: true, name: true, pricePerReview: true } } } },
          _count: {
            select: { reviewItems: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.campaign.count({ where })
    ]);

    return NextResponse.json({ campaigns, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin campaigns error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
