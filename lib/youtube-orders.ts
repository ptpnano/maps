import { Prisma, YoutubeOrderStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sendTelegramMessage } from "./telegram";
import { serviceLabel } from "./youtube";

const ACTIVE_YOUTUBE_ORDER_STATUSES: YoutubeOrderStatus[] = ["queued", "running", "partial"];
type YoutubeCompletionType = "completed" | "completed_overdue" | "completed_by_admin";

export async function addYoutubeOrderEvent(
  orderId: string,
  type: string,
  message: string,
  actorId?: string | null,
  metadata: Prisma.InputJsonValue = {},
) {
  return db.youtubeOrderEvent.create({
    data: { orderId, type, message, actorId: actorId || null, metadata },
  });
}

export async function getYoutubeOrderTimeoutHours() {
  const config = await db.systemConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", holdingDays: 7, jobTimeoutMinutes: 30, youtubeOrderTimeoutHours: 24 },
  });
  return Math.max(1, Number(config.youtubeOrderTimeoutHours || 24));
}

export async function completeYoutubeOrder(
  orderId: string,
  actorId?: string | null,
  reason = "Admin đánh dấu đơn YouTube hoàn thành",
  completionType: YoutubeCompletionType = "completed_by_admin",
) {
  const order = await db.youtubeOrder.findUnique({
    where: { id: orderId },
    include: { targets: true, client: true },
  });
  if (!order) throw new Error("Order not found");
  if (["rejected", "cancelled", "completed"].includes(order.status)) return order;

  const now = new Date();
  await db.youtubeOrderTarget.updateMany({
    where: {
      orderId: order.id,
      OR: [
        { ytbStatus: null },
        { ytbStatus: { notIn: ["done", "completed"] } },
      ],
    },
    data: {
      isPaused: true,
      ytbStatus: "completed",
      ytbLastError: null,
      lastSyncedAt: now,
    },
  });

  await db.youtubeWorkerClaimTarget.updateMany({
    where: {
      orderId: order.id,
      status: { in: ["claimed", "running"] },
      leaseUntil: { gt: now },
    },
    data: {
      status: "expired",
      leaseUntil: now,
      lastError: reason,
    },
  });

  await db.youtubeOrder.update({
    where: { id: order.id },
    data: {
      status: "completed",
      ytbSyncStatus: completionType,
      ytbLastError: null,
      ytbLastSyncAt: now,
    },
  });

  await settleYoutubeOrder(order.id);
  await addYoutubeOrderEvent(order.id, completionType, reason, actorId, {
    targetCount: order.targets.length,
  });
  await sendTelegramMessage(`Đơn YouTube đã hoàn thành\n${serviceLabel(order.serviceType)}\nKhách: ${order.client.email}\nSố lượng: ${order.totalQuantity}\nLý do: ${reason}`);

  return db.youtubeOrder.findUnique({
    where: { id: order.id },
    include: { targets: true, client: true },
  });
}

export async function completeOverdueYoutubeOrders(source: "cron" | "worker" = "worker", actorId?: string | null) {
  const timeoutHours = await getYoutubeOrderTimeoutHours();
  const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);
  const orders = await db.youtubeOrder.findMany({
    where: {
      status: { in: ACTIVE_YOUTUBE_ORDER_STATUSES },
      approvedAt: { lt: cutoff },
    },
    select: { id: true },
    take: 50,
  });

  let completed = 0;
  for (const order of orders) {
    await completeYoutubeOrder(order.id, actorId, `Tự động hoàn thành vì quá hạn ${timeoutHours} giờ`, "completed_overdue");
    completed++;
  }

  await db.systemConfig.upsert({
    where: { id: "default" },
    update: {
      youtubeOverdueScanLastAt: new Date(),
      youtubeOverdueScanSource: source,
      youtubeOverdueScanStatus: "ok",
      youtubeOverdueScanCompleted: completed,
    },
    create: {
      id: "default",
      holdingDays: 7,
      jobTimeoutMinutes: 30,
      youtubeOrderTimeoutHours: timeoutHours,
      youtubeOverdueScanLastAt: new Date(),
      youtubeOverdueScanSource: source,
      youtubeOverdueScanStatus: "ok",
      youtubeOverdueScanCompleted: completed,
    },
  });

  return { completed, timeoutHours, source };
}

export async function enqueueYoutubeOrder(orderId: string, actorId?: string | null) {
  const order = await db.youtubeOrder.findUnique({
    where: { id: orderId },
    include: { targets: true, serviceConfig: true, client: true },
  });
  if (!order) throw new Error("Order not found");
  if (["rejected", "cancelled", "completed"].includes(order.status)) return order;

  await db.youtubeOrder.update({
    where: { id: order.id },
    data: {
      status: "queued",
      approvedById: actorId || order.approvedById,
      approvedAt: order.approvedAt || new Date(),
      ytbSyncStatus: "queued_for_worker",
      ytbLastError: null,
      ytbLastSyncAt: new Date(),
    },
  });

  await db.youtubeOrderTarget.updateMany({
    where: {
      orderId: order.id,
      OR: [
        { ytbStatus: null },
        { ytbStatus: { in: ["enqueue_failed", "failed"] } },
      ],
    },
    data: {
      ytbStatus: "queued",
      ytbQuotaTotal: 0,
      ytbLastError: null,
    },
  });

  await addYoutubeOrderEvent(
    order.id,
    "queued_for_worker",
    "Don da vao queue noi bo cua Maps, cho worker YouTube nhan xu ly",
    actorId,
    { targetCount: order.targets.length },
  );

  await sendTelegramMessage(`✅ Đơn YouTube đã vào hàng đợi\n${serviceLabel(order.serviceType)}\nKhách: ${order.client.email}\nSố lượng: ${order.totalQuantity}`);

  return db.youtubeOrder.findUnique({
    where: { id: order.id },
    include: { targets: true, client: true },
  });
}

export async function syncYoutubeOrder(orderId: string, actorId?: string | null) {
  return recalculateYoutubeOrder(orderId, actorId);
}

export async function recalculateYoutubeOrder(orderId: string, actorId?: string | null) {
  const order = await db.youtubeOrder.findUnique({
    where: { id: orderId },
    include: { targets: true, client: { include: { wallet: true } } },
  });
  if (!order) throw new Error("Order not found");

  const targetCount = order.targets.length;
  const done = order.targets.filter((target) => ["done", "completed"].includes(target.ytbStatus || "")).length;
  const delivered = order.targets.reduce((sum, target) => {
    return sum + Math.min(Number(target.deliveredQuantity || 0), Number(target.quantity || 0));
  }, 0);
  const hasRunning = order.targets.some((target) => ["claimed", "running", "active"].includes(target.ytbStatus || ""));
  const errors = order.targets
    .filter((target) => target.ytbLastError)
    .map((target) => `${target.targetKey}: ${target.ytbLastError}`)
    .slice(0, 20);

  let nextStatus: YoutubeOrderStatus = order.status;
  if (targetCount > 0 && done === targetCount) nextStatus = "completed";
  else if (delivered > 0 || hasRunning) nextStatus = "running";
  else if (errors.length && ["queued", "running"].includes(order.status)) nextStatus = "partial";
  else if (order.status === "pending_review") nextStatus = "pending_review";
  else nextStatus = "queued";

  const updated = await db.youtubeOrder.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      ytbSyncStatus: errors.length ? "worker_partial" : "worker_synced",
      ytbLastError: errors.length ? errors.join("\n").slice(0, 2000) : null,
      ytbLastSyncAt: new Date(),
    },
  });

  if (nextStatus === "completed" && order.status !== "completed") {
    await settleYoutubeOrder(order.id);
    await addYoutubeOrderEvent(
      order.id,
      "completed",
      "Đơn hoàn thành do đã đủ quota khấu hao",
      actorId,
      { delivered, totalQuantity: order.totalQuantity, totalExecutionQuantity: order.totalExecutionQuantity, targetCount },
    );
    await sendTelegramMessage(`✅ Đơn YouTube hoàn thành\n${serviceLabel(order.serviceType)}\nKhách: ${order.client.email}\nSố lượng: ${order.totalQuantity}`);
  }

  await addYoutubeOrderEvent(
    order.id,
    errors.length ? "worker_sync_partial" : "worker_sync_completed",
    errors.length ? "Dong bo worker co loi o mot so target" : "Dong bo trang thai worker thanh cong",
    actorId,
    { errors, delivered, targetCount },
  );

  return updated;
}

export async function settleYoutubeOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.youtubeOrder.findUnique({
      where: { id: orderId },
      include: { targets: true, client: { include: { wallet: true } } },
    });
    if (!order || order.frozenAmount.toNumber() <= 0 || !order.client.wallet) return order;

    const totalQuantity = Math.max(0, Number(order.totalQuantity || 0));
    const deliveredQuantity = order.targets.reduce((sum, target) => {
      return sum + Math.min(Number(target.deliveredQuantity || target.ytbQuotaDone || 0), Number(target.quantity || 0));
    }, 0);
    const chargedQuantity = totalQuantity > 0 ? Math.min(deliveredQuantity, totalQuantity) : 0;
    const missingQuantity = Math.max(0, totalQuantity - chargedQuantity);
    const unitPrice = totalQuantity > 0 ? order.totalCost.div(totalQuantity) : new Prisma.Decimal(0);
    const refundAmount = unitPrice.mul(missingQuantity);
    const chargeAmount = order.totalCost.sub(refundAmount);

    const wallet = order.client.wallet;
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        frozenBalance: { decrement: order.totalCost },
        availableBalance: { increment: refundAmount },
        totalSpent: { increment: chargeAmount },
      },
    });

    await tx.youtubeOrder.update({
      where: { id: order.id },
      data: {
        frozenAmount: 0,
        settledAmount: chargeAmount,
        status: "completed",
      },
    });

    if (chargeAmount.greaterThan(0)) {
      await tx.transactionLog.create({
        data: {
          userId: order.clientId,
          walletId: wallet.id,
          type: "payout_client",
          oldBalance: wallet.frozenBalance,
          newBalance: updatedWallet.frozenBalance,
          changeAmount: chargeAmount.mul(-1),
          reason: `Thanh toán đơn YouTube #${order.id.slice(0, 8)} (${chargedQuantity}/${totalQuantity})`,
          referenceType: "youtube_order",
          referenceId: order.id,
          idempotencyKey: `settle_youtube_${order.id}_${randomUUID()}`,
        },
      });
    }

    if (refundAmount.greaterThan(0)) {
      await tx.transactionLog.create({
        data: {
          userId: order.clientId,
          walletId: wallet.id,
          type: "refund",
          oldBalance: wallet.availableBalance,
          newBalance: updatedWallet.availableBalance,
          changeAmount: refundAmount,
          reason: `Hoàn tiền ${missingQuantity} ${serviceLabel(order.serviceType)} thiếu cho đơn YouTube #${order.id.slice(0, 8)}`,
          referenceType: "youtube_order",
          referenceId: order.id,
          idempotencyKey: `refund_youtube_partial_${order.id}_${randomUUID()}`,
        },
      });
    }

    await tx.youtubeOrderEvent.create({
      data: {
        orderId: order.id,
        type: refundAmount.greaterThan(0) ? "settled_with_refund" : "settled",
        message: refundAmount.greaterThan(0)
          ? `Hoàn tiền phần thiếu ${missingQuantity}/${totalQuantity}`
          : "Đơn đã được quyết toán đủ số lượng",
        metadata: {
          totalQuantity,
          deliveredQuantity,
          chargedQuantity,
          missingQuantity,
          chargeAmount: chargeAmount.toString(),
          refundAmount: refundAmount.toString(),
        },
      },
    });

    return order;
  });
}

export async function refundYoutubeOrder(orderId: string, reason: string, actorId?: string | null) {
  return db.$transaction(async (tx) => {
    const order = await tx.youtubeOrder.findUnique({
      where: { id: orderId },
      include: { client: { include: { wallet: true } } },
    });
    if (!order || !order.client.wallet) throw new Error("Order or wallet not found");
    if (!["pending_review", "queued", "partial", "failed"].includes(order.status)) return order;

    const wallet = order.client.wallet;
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: order.frozenAmount },
        frozenBalance: { decrement: order.frozenAmount },
      },
    });

    await tx.youtubeOrder.update({
      where: { id: order.id },
      data: {
        status: "rejected",
        frozenAmount: 0,
        rejectionReason: reason,
      },
    });

    await tx.transactionLog.create({
      data: {
        userId: order.clientId,
        walletId: wallet.id,
        type: "refund",
        oldBalance: wallet.availableBalance,
        newBalance: updatedWallet.availableBalance,
        changeAmount: order.frozenAmount,
        reason,
        referenceType: "youtube_order",
        referenceId: order.id,
        performedById: actorId || undefined,
        idempotencyKey: `refund_youtube_${order.id}_${randomUUID()}`,
      },
    });

    await tx.youtubeOrderEvent.create({
      data: { orderId: order.id, actorId: actorId || null, type: "rejected", message: reason, metadata: {} },
    });

    return order;
  });
}
