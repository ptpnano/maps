import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueYoutubeOrder } from "@/lib/youtube-orders";
import { sanitizeText } from "@/lib/youtube";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  quantity: z.number().int().min(1).optional(),
  reason: z.string().optional().default("Admin tạo đơn bù"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const source = await db.youtubeOrder.findUnique({
      where: { id },
      include: { targets: true, serviceConfig: true },
    });
    if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const quantity = parsed.data.quantity;
    const order = await db.youtubeOrder.create({
      data: {
        clientId: source.clientId,
        serviceType: source.serviceType,
        serviceConfigId: source.serviceConfigId,
        status: "queued",
        totalQuantity: quantity ? quantity * source.targets.length : source.totalQuantity,
        totalExecutionQuantity: quantity ? quantity * source.targets.length : source.totalQuantity,
        totalCost: 0,
        frozenAmount: 0,
        note: sanitizeText(parsed.data.reason),
        commentLines: source.commentLines,
        allowDuplicateComments: source.allowDuplicateComments,
        isCompensation: true,
        compensationForId: source.id,
        approvedById: session.user.id,
        approvedAt: new Date(),
        targets: {
          create: source.targets.map((target) => ({
            serviceType: source.serviceType,
            input: target.input,
            targetKey: target.targetKey,
            targetUrl: target.targetUrl,
            quantity: quantity || target.quantity,
            executionQuantity: quantity || target.quantity,
            ytbQuotaTotal: quantity || target.quantity,
          })),
        },
        events: {
          create: {
            actorId: session.user.id,
            type: "compensation_created",
            message: sanitizeText(parsed.data.reason),
            metadata: { sourceOrderId: source.id },
          },
        },
      },
      include: { targets: true },
    });

    await enqueueYoutubeOrder(order.id, session.user.id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("Compensate YouTube order error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
