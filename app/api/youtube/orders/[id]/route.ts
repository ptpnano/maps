import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const order = await db.youtubeOrder.findFirst({
      where: { id, clientId: session.user.id },
      include: {
        targets: true,
        events: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get YouTube order error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
