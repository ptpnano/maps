import { auth } from "@/lib/auth";
import { enqueueYoutubeOrder } from "@/lib/youtube-orders";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const order = await enqueueYoutubeOrder(id, session.user.id);
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Approve YouTube order error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
