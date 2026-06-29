import { auth } from "@/lib/auth";
import { refundYoutubeOrder } from "@/lib/youtube-orders";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order = await refundYoutubeOrder(id, String(body.reason || "Đơn YouTube bị admin từ chối"), session.user.id);
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Reject YouTube order error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
