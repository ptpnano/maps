import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const workerKey = searchParams.get("workerKey") || "";
    const serviceType = searchParams.get("serviceType") as YoutubeServiceType | null;
    const targetId = searchParams.get("targetId") || "";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));

    const targetWhere: any = {
      ...(targetId ? { id: targetId } : {}),
      ...(serviceType ? { serviceType } : {}),
      ...(workerKey ? { workerActionHistories: { some: { workerKey } } } : {}),
    };

    const targets = await db.youtubeOrderTarget.findMany({
      where: targetWhere,
      include: {
        order: {
          include: {
            client: { select: { email: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const targetIds = targets.map((target) => target.id);
    if (targetIds.length === 0) {
      return NextResponse.json({ targets: [], histories: [], workers: [] });
    }

    const historyWhere: any = {
      targetId: { in: targetIds },
      ...(workerKey ? { workerKey } : {}),
    };

    const [histories, successByTarget, ipGroups, gmailGroups, workers] = await Promise.all([
      db.youtubeWorkerActionHistory.findMany({
        where: historyWhere,
        orderBy: { actedAt: "desc" },
        take: 500,
      }),
      db.youtubeWorkerActionHistory.groupBy({
        by: ["targetId"],
        where: { ...historyWhere, status: "success", gmail: { not: null } },
        _count: { _all: true },
      }),
      db.youtubeWorkerActionHistory.groupBy({
        by: ["targetId", "ip"],
        where: { ...historyWhere, status: "success", ip: { not: null } },
        _count: { _all: true },
      }),
      db.youtubeWorkerActionHistory.groupBy({
        by: ["targetId", "gmail"],
        where: { ...historyWhere, status: "success", gmail: { not: null } },
        _count: { _all: true },
      }),
      db.youtubeWorker.findMany({
        orderBy: { workerKey: "asc" },
        select: { workerKey: true, label: true, status: true, lastSeenAt: true },
      }),
    ]);

    const successMap = new Map(successByTarget.map((row) => [row.targetId || "", row._count._all]));
    const ipStats = new Map<string, {
      totalIpCount: number;
      uniqueIpCount: number;
      duplicateIpCount: number;
      duplicateIpExtraCount: number;
      rows: any[];
      occurrenceBuckets: { occurrences: number; ipCount: number }[];
    }>();
    const gmailStats = new Map<string, { uniqueGmailCount: number }>();

    for (const target of targets) {
      const rows = ipGroups.filter((row) => row.targetId === target.id && row.ip);
      const duplicates = rows.filter((row) => row._count._all > 1);
      const occurrenceMap = new Map<number, number>();
      for (const row of rows) {
        const occurrences = row._count._all;
        occurrenceMap.set(occurrences, (occurrenceMap.get(occurrences) || 0) + 1);
      }
      ipStats.set(target.id, {
        totalIpCount: rows.reduce((sum, row) => sum + row._count._all, 0),
        uniqueIpCount: rows.length,
        duplicateIpCount: duplicates.length,
        duplicateIpExtraCount: duplicates.reduce((sum, row) => sum + Math.max(0, row._count._all - 1), 0),
        occurrenceBuckets: Array.from(occurrenceMap.entries())
          .map(([occurrences, ipCount]) => ({ occurrences, ipCount }))
          .sort((a, b) => a.occurrences - b.occurrences),
        rows: rows
          .map((row) => ({ ip: row.ip, count: row._count._all }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      });
      gmailStats.set(target.id, {
        uniqueGmailCount: gmailGroups.filter((row) => row.targetId === target.id && row.gmail).length,
      });
    }

    return NextResponse.json({
      workers,
      targets: targets.map((target) => ({
        id: target.id,
        orderId: target.orderId,
        serviceType: target.serviceType,
        targetKey: target.targetKey,
        targetUrl: target.targetUrl,
        isPaused: target.isPaused,
        status: target.ytbStatus,
        quantity: target.quantity,
        executionQuantity: target.executionQuantity,
        ytbQuotaDone: target.ytbQuotaDone,
        deliveredQuantity: target.deliveredQuantity,
        successHistoryCount: successMap.get(target.id) || 0,
        uniqueGmailCount: gmailStats.get(target.id)?.uniqueGmailCount || 0,
        ipStats: ipStats.get(target.id) || { totalIpCount: 0, uniqueIpCount: 0, duplicateIpCount: 0, duplicateIpExtraCount: 0, rows: [], occurrenceBuckets: [] },
        client: target.order.client,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      })),
      histories,
    });
  } catch (error) {
    console.error("Admin YouTube reports GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
