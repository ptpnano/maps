import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// POST: Client dispatches a single review item (sets scheduledAt=now, dispatchedAt=now)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const body = await req.json();
    const { reviewItemId } = body;

    if (!reviewItemId) {
      return NextResponse.json({ error: "reviewItemId is required" }, { status: 400 });
    }

    // Verify campaign ownership
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true, status: true }
    });

    if (!campaign || campaign.clientId !== session.user.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: "Chiến dịch phải ở trạng thái hoạt động" }, { status: 400 });
    }

    // Find and update the review item
    const reviewItem = await db.reviewItem.findFirst({
      where: {
        id: reviewItemId,
        campaignId: campaignId,
        status: 'pending'
      }
    });

    if (!reviewItem) {
      return NextResponse.json({ error: "Review item not found or not pending" }, { status: 404 });
    }

    const now = new Date();
    const updated = await db.reviewItem.update({
      where: { id: reviewItemId },
      data: {
        scheduledAt: now,
        dispatchedAt: now
      }
    });

    return NextResponse.json({ success: true, reviewItem: updated });
  } catch (error) {
    console.error("Dispatch review error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
