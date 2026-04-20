import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await db.campaign.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true, name: true, email: true, phone: true,
            wallet: { select: { availableBalance: true, frozenBalance: true } }
          }
        },
        mapLocation: true,
        pricingTier: true,
        tierItems: {
          include: {
            pricingTier: { select: { level: true, name: true, pricePerReview: true, workerPayout: true, minAccountLevel: true, maxAccountLevel: true } }
          }
        },
        reviewItems: {
          include: {
            assignedWorker: { select: { id: true, name: true, email: true, trustScore: true } },
            assignedAccount: { select: { accountName: true, level: true } },
            pricingTier: { select: { level: true, name: true } },
          },
          orderBy: { updatedAt: 'desc' }
        },
        _count: { select: { reviewItems: true } }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Admin campaign detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
