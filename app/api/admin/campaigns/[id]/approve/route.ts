import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// POST: Admin approves a pending campaign → active
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== 'pending') {
      return NextResponse.json({ error: "Chỉ có thể duyệt chiến dịch đang chờ duyệt" }, { status: 400 });
    }

    const updated = await db.campaign.update({
      where: { id },
      data: { status: 'active' }
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error) {
    console.error("Admin approve campaign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
