import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  customContent: z.string().nullish(),
  customImages: z.array(z.string().min(1)).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; reviewId: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Verify campaign ownership
    const campaign = await db.campaign.findUnique({
      where: { id: params.id, clientId: session.user.id }
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Find the review item and verify it belongs to this campaign and is in 'pending' (Queue) status
    const reviewItem = await db.reviewItem.findUnique({
      where: { id: params.reviewId }
    });
    if (!reviewItem || reviewItem.campaignId !== params.id) {
      return NextResponse.json({ error: "Review item not found" }, { status: 404 });
    }
    if (reviewItem.status !== 'pending') {
      return NextResponse.json({ error: "Can only edit review items in Queue (pending) status" }, { status: 400 });
    }

    // Validate scheduledAt is in the future
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
      }
    }

    const updated = await db.reviewItem.update({
      where: { id: params.reviewId },
      data: {
        ...(data.customContent !== undefined && { customContent: data.customContent ?? null }),
        ...(data.customImages !== undefined && { customImages: data.customImages }),
        ...(data.scheduledAt !== undefined && { scheduledAt: new Date(data.scheduledAt) }),
      }
    });

    return NextResponse.json({ reviewItem: updated });
  } catch (error) {
    console.error("Patch review item error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
