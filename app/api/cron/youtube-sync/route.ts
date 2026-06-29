import { db } from "@/lib/db";
import { completeOverdueYoutubeOrders, syncYoutubeOrder } from "@/lib/youtube-orders";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const overdue = await completeOverdueYoutubeOrders("cron");
    const orders = await db.youtubeOrder.findMany({
      where: { status: { in: ["queued", "running", "partial", "failed"] } },
      orderBy: { ytbLastSyncAt: "asc" },
      take: 50,
    });

    const errors: string[] = [];
    let synced = 0;
    for (const order of orders) {
      try {
        await syncYoutubeOrder(order.id);
        synced++;
      } catch (error: any) {
        errors.push(`${order.id}: ${error.message || "sync failed"}`);
      }
    }

    return NextResponse.json({ success: true, processed: orders.length, synced, overdue, errors });
  } catch (error) {
    console.error("Cron YouTube sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
