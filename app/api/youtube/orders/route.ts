import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getYoutubeServiceConfig } from "@/lib/youtube-config";
import { addYoutubeOrderEvent, enqueueYoutubeOrder } from "@/lib/youtube-orders";
import { executionQuantity, parseYoutubeTargets, sanitizeText, serviceLabel } from "@/lib/youtube";
import { sendTelegramMessage } from "@/lib/telegram";
import { YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

const createSchema = z.object({
  serviceType: z.nativeEnum(YoutubeServiceType),
  targetsText: z.string().min(1),
  quantity: z.number().int().min(1),
  note: z.string().optional().default(""),
  commentLines: z.array(z.string()).optional().default([]),
  allowDuplicateComments: z.boolean().optional().default(true),
});

const ACTIVE_ORDER_STATUSES = ["pending_review", "queued", "running", "partial"] as const;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;
    const config = await getYoutubeServiceConfig(body.serviceType);
    if (!config.isActive) {
      return NextResponse.json({ error: "Dịch vụ đang tạm tắt" }, { status: 400 });
    }

    const { targets, errors } = parseYoutubeTargets(body.serviceType, body.targetsText, body.quantity);
    if (targets.length === 0) {
      return NextResponse.json({ error: "Không có target hợp lệ", errors }, { status: 400 });
    }

    const activeTargets = await db.youtubeOrderTarget.findMany({
      where: {
        serviceType: body.serviceType,
        targetKey: { in: targets.map((target) => target.targetKey) },
        order: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      },
      select: { targetKey: true },
    });
    if (activeTargets.length > 0) {
      const duplicateTargets = Array.from(new Set(activeTargets.map((target) => target.targetKey)));
      return NextResponse.json({
        error: `Target ${duplicateTargets.join(", ")} đã tồn tại trong hệ thống cho dịch vụ ${serviceLabel(body.serviceType)}. Vui lòng chờ đơn hiện tại hoàn thành rồi đặt lại.`,
        duplicateTargets,
      }, { status: 409 });
    }

    for (const target of targets) {
      if (target.quantity < config.minQuantity || target.quantity > config.maxQuantity) {
        return NextResponse.json({
          error: `Số lượng cho ${target.targetKey} phải từ ${config.minQuantity} đến ${config.maxQuantity}`,
          errors,
        }, { status: 400 });
      }
    }

    let comments = body.commentLines.map((line) => sanitizeText(line, 500)).filter(Boolean);
    if (body.serviceType === "comment") {
      if (!body.allowDuplicateComments) comments = Array.from(new Set(comments));
      if (comments.length === 0) {
        return NextResponse.json({ error: "Dịch vụ comment cần ít nhất 1 nội dung comment" }, { status: 400 });
      }
    } else {
      comments = [];
    }

    const overdelivery = config.overdeliveryPercent.toNumber();
    const totalQuantity = targets.reduce((sum, target) => sum + target.quantity, 0);
    const totalExecutionQuantity = targets.reduce((sum, target) => sum + executionQuantity(target.quantity, overdelivery), 0);
    const totalCost = config.pricePerUnit.mul(totalQuantity);
    const status = config.requireApproval ? "pending_review" : "queued";

    const order = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: session.user.id } });
      if (!wallet || wallet.availableBalance.lessThan(totalCost)) throw new Error("Insufficient balance");

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalCost },
          frozenBalance: { increment: totalCost },
        },
      });

      const created = await tx.youtubeOrder.create({
        data: {
          clientId: session.user.id,
          serviceType: body.serviceType,
          serviceConfigId: config.id,
          status,
          totalQuantity,
          totalExecutionQuantity,
          totalCost,
          frozenAmount: totalCost,
          note: sanitizeText(body.note, 5000),
          commentLines: comments,
          allowDuplicateComments: body.allowDuplicateComments,
          targets: {
            create: targets.map((target) => {
              const runQuantity = executionQuantity(target.quantity, overdelivery);
              return {
                serviceType: body.serviceType,
                input: target.input,
                targetKey: target.targetKey,
                targetUrl: target.targetUrl,
                quantity: target.quantity,
                executionQuantity: runQuantity,
                ytbQuotaTotal: runQuantity,
              };
            }),
          },
          events: {
            create: {
              type: "created",
              message: config.requireApproval ? "Đơn đã được tạo và chờ admin duyệt" : "Đơn đã được tạo và sẽ tự động vào queue worker",
              metadata: { errors },
            },
          },
        },
        include: { targets: true, client: true },
      });

      await tx.transactionLog.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          type: "freeze",
          oldBalance: wallet.availableBalance,
          newBalance: updatedWallet.availableBalance,
          changeAmount: totalCost.mul(-1),
          reason: `Tạm giữ cho đơn YouTube ${serviceLabel(body.serviceType)} #${created.id.slice(0, 8)}`,
          referenceType: "youtube_order",
          referenceId: created.id,
          idempotencyKey: `freeze_youtube_${created.id}_${randomUUID()}`,
        },
      });

      return created;
    });

    await sendTelegramMessage(`Đơn YouTube mới\n${serviceLabel(order.serviceType)}\nKhách: ${session.user.email}\nSố lượng: ${totalQuantity}\nTrạng thái: ${config.requireApproval ? "Chờ duyệt" : "Tự động gửi"}`);

    if (!config.requireApproval) {
      try {
        await enqueueYoutubeOrder(order.id, session.user.id);
      } catch (error: any) {
        await addYoutubeOrderEvent(order.id, "enqueue_error", error.message || "Không đưa được đơn vào queue worker", session.user.id);
      }
    }

    return NextResponse.json({ order, errors }, { status: 201 });
  } catch (error: any) {
    console.error("Create YouTube order error:", error);
    if (error.message === "Insufficient balance") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get("serviceType") as YoutubeServiceType | null;
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const orders = await db.youtubeOrder.findMany({
      where: {
        clientId: session.user.id,
        isCompensation: false,
        ...(serviceType ? { serviceType } : {}),
        ...(status ? { status: status as any } : {}),
        ...(from || to ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
      },
      include: { targets: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("List YouTube orders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
