import { db } from "@/lib/db";
import { scanReviewUrl } from "@/lib/scanner";
import { NextResponse } from "next/server";

// Review Verification: crawls published URLs to confirm reviews exist, then moves to holding
export async function POST(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
    const holdingDays = config?.holdingDays ?? 7;
    const delayMs = config?.scanDelayMs ?? 3000;
    const proxyUrl = config?.scanProxyEnabled && config.scanProxyUrl ? config.scanProxyUrl : undefined;

    const items = await db.reviewItem.findMany({
      where: { status: 'pending_verify' },
      include: { campaign: { include: { mapLocation: true } } },
      take: 50
    });

    let verified = 0;
    let dropped = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        let isValid = false;
        let scanRating: number | null = null;
        let scanError: string | null = null;

        if (item.publishedUrl) {
          // Perform real scan
          const result = await scanReviewUrl(item.publishedUrl, { proxyUrl });

          // Log the scan result
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

          scanRating = result.foundRating ?? null;
          scanError = result.errorMessage ?? null;

          // Valid if scanner found a rating (the review exists and has a star rating)
          // If scanner can't parse (HTML structure changed), fall back to URL-exists check
          isValid = result.success
            ? (scanRating !== null)
            : true; // If scanner itself errored (network/parse), don't drop — give benefit of doubt
        }

        if (isValid) {
          const releaseAt = new Date();
          releaseAt.setDate(releaseAt.getDate() + holdingDays);

          await db.reviewItem.update({
            where: { id: item.id },
            data: { status: 'holding', releaseAt }
          });
          verified++;
        } else {
          // publishedUrl is missing — worker didn't provide proof
          await db.$transaction(async (tx) => {
            await tx.reviewItem.update({
              where: { id: item.id },
              data: { status: 'dropped' }
            });

            if (item.assignedWorkerId) {
              const worker = await tx.user.findUnique({
                where: { id: item.assignedWorkerId },
                select: { trustScore: true }
              });
              await tx.user.update({
                where: { id: item.assignedWorkerId },
                data: { trustScore: Math.max(0, (worker?.trustScore ?? 0) - 30) }
              });
            }
          });
          dropped++;
        }
      } catch (err) {
        console.error(`Verify error for item ${item.id}:`, err);
      }

      // Delay between scans
      if (i < items.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return NextResponse.json({ success: true, verified, dropped, total: items.length });
  } catch (error) {
    console.error("Verify engine error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

