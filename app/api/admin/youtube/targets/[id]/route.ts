import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  isPaused: z.boolean().optional(),
  executionQuantity: z.number().int().min(1).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid target data", details: parsed.error.format() }, { status: 400 });
    }

    const current = await db.youtubeOrderTarget.findUnique({
      where: { id },
      include: { order: { include: { targets: true } } },
    });
    if (!current) return NextResponse.json({ error: "Target not found" }, { status: 404 });

    if (parsed.data.executionQuantity !== undefined && parsed.data.executionQuantity < current.quantity) {
      return NextResponse.json({
        error: `Quota chạy không được nhỏ hơn số lượng khách đặt (${current.quantity})`,
      }, { status: 400 });
    }

    const target = await db.$transaction(async (tx) => {
      const updatedTarget = await tx.youtubeOrderTarget.update({
        where: { id },
        data: {
          ...(parsed.data.isPaused !== undefined ? { isPaused: parsed.data.isPaused } : {}),
          ...(parsed.data.isPaused === true ? { ytbStatus: "paused" } : {}),
          ...(parsed.data.isPaused === false ? { ytbStatus: "queued", ytbLastError: null } : {}),
          ...(parsed.data.executionQuantity !== undefined ? {
            executionQuantity: parsed.data.executionQuantity,
            ytbQuotaTotal: parsed.data.executionQuantity,
          } : {}),
        },
      });

      if (parsed.data.executionQuantity !== undefined) {
        const targets = await tx.youtubeOrderTarget.findMany({
          where: { orderId: current.orderId },
          select: { executionQuantity: true },
        });
        await tx.youtubeOrder.update({
          where: { id: current.orderId },
          data: {
            totalExecutionQuantity: targets.reduce((sum, row) => sum + row.executionQuantity, 0),
          },
        });
      }

      return updatedTarget;
    });

    if (parsed.data.isPaused) {
      await db.youtubeWorkerClaimTarget.updateMany({
        where: {
          targetId: id,
          status: { in: ["claimed", "running", "partial"] },
        },
        data: { status: "expired" },
      });
    }

    await db.youtubeOrderEvent.create({
      data: {
        orderId: target.orderId,
        actorId: session.user.id,
        type: parsed.data.executionQuantity !== undefined
          ? "target_quota_updated"
          : parsed.data.isPaused ? "target_paused" : "target_resumed",
        message: parsed.data.executionQuantity !== undefined
          ? `Admin cập nhật quota chạy ${target.targetKey}: ${current.executionQuantity} -> ${parsed.data.executionQuantity}`
          : `${target.targetKey} ${parsed.data.isPaused ? "paused" : "resumed"} by admin`,
        metadata: {
          targetId: target.id,
          oldExecutionQuantity: current.executionQuantity,
          newExecutionQuantity: parsed.data.executionQuantity,
        },
      },
    });

    return NextResponse.json({ target });
  } catch (error) {
    console.error("Admin YouTube target PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
