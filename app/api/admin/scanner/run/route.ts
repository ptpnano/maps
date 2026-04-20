import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scanReviewUrl } from "@/lib/scanner";
import { NextResponse } from "next/server";

// POST /api/admin/scanner/run
// Body: { limit?: number } — number of items to scan in this batch
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const batchLimit = Math.min(50, Math.max(1, parseInt(body.limit || '10')));

  // Get scanner config
  const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
  const delayMs = config?.scanDelayMs ?? 3000;
  const proxyUrl = config?.scanProxyEnabled && config.scanProxyUrl ? config.scanProxyUrl : undefined;

  // Find review items that have a publishedUrl and are in pending_verify or live status
  const items = await db.reviewItem.findMany({
    where: {
      publishedUrl: { not: null },
      status: { in: ['pending_verify', 'live', 'holding'] },
    },
    select: {
      id: true,
      publishedUrl: true,
      targetRating: true,
      status: true,
    },
    orderBy: { updatedAt: 'asc' },
    take: batchLimit,
  });

  if (items.length === 0) {
    return NextResponse.json({ success: true, scanned: 0, results: [] });
  }

  const results: Array<{
    reviewItemId: string;
    publishedUrl: string;
    success: boolean;
    foundRating?: number;
    reviewCount?: number;
    errorMessage?: string;
    durationMs: number;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = await scanReviewUrl(item.publishedUrl!, { proxyUrl });

    // Save scan log
    await db.scanLog.create({
      data: {
        reviewItemId: item.id,
        status: result.success ? 'success' : 'failed',
        foundRating: result.foundRating ?? null,
        reviewCount: result.reviewCount ?? null,
        errorMessage: result.errorMessage ?? null,
        scanDurationMs: result.durationMs,
        rawResponse: result.rawSnippet ?? null,
      },
    });

    results.push({
      reviewItemId: item.id,
      publishedUrl: item.publishedUrl!,
      success: result.success,
      foundRating: result.foundRating,
      reviewCount: result.reviewCount,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
    });

    // Delay between scans to avoid rate limiting
    if (i < items.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return NextResponse.json({
    success: true,
    scanned: results.length,
    results,
  });
}
