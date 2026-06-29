import { auth } from "@/lib/auth";
import { completeYoutubeOrder } from "@/lib/youtube-orders";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "Admin đánh dấu đơn YouTube hoàn thành");
    const order = await completeYoutubeOrder(id, session.user.id, reason);
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Complete YouTube order error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
