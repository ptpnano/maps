import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'worker') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify account belongs to worker
    const account = await db.workerAccount.findFirst({
      where: { id: params.id, workerId: session.user.id }
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const [items, total] = await Promise.all([
      db.reviewItem.findMany({
        where: { assignedAccountId: params.id },
        include: {
          campaign: {
            include: {
              mapLocation: { select: { name: true, googleMapsUrl: true } },
              pricingTier: { select: { level: true, name: true } }
            }
          },
          pricingTier: { select: { level: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.reviewItem.count({ where: { assignedAccountId: params.id } })
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Account history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
