import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scanReviewUrl } from "@/lib/scanner";
import { NextResponse } from "next/server";

// POST /api/admin/scanner/rescan/[id]
// Rescan a specific review item by scanLog ID or reviewItem ID
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the review item (id can be a scanLog.id or reviewItem.id)
  let reviewItem = await db.reviewItem.findUnique({
    where: { id },
    select: { id: true, publishedUrl: true, targetRating: true, status: true },
  });

  // If not found as reviewItem, try scanLog
  if (!reviewItem) {
    const log = await db.scanLog.findUnique({
      where: { id },
      select: { reviewItem: { select: { id: true, publishedUrl: true, targetRating: true, status: true } } },
    });
    if (log?.reviewItem) reviewItem = log.reviewItem;
  }

  if (!reviewItem) {
    return NextResponse.json({ error: "Review item not found" }, { status: 404 });
  }

  if (!reviewItem.publishedUrl) {
    return NextResponse.json({ error: "Review item has no published URL to scan" }, { status: 400 });
  }

  // Get scanner config
  const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
  const proxyUrl = config?.scanProxyEnabled && config.scanProxyUrl ? config.scanProxyUrl : undefined;

  const result = await scanReviewUrl(reviewItem.publishedUrl, { proxyUrl });

  const log = await db.scanLog.create({
    data: {
      reviewItemId: reviewItem.id,
      status: result.success ? 'success' : 'failed',
      foundRating: result.foundRating ?? null,
      reviewCount: result.reviewCount ?? null,
      errorMessage: result.errorMessage ?? null,
      scanDurationMs: result.durationMs,
      rawResponse: result.rawSnippet ?? null,
    },
  });

  return NextResponse.json({ success: true, log, result });
}
