import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scanReviewUrl } from "@/lib/scanner";
import { NextResponse } from "next/server";
import { z } from "zod";

const testSchema = z.object({
  url: z.string().url(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = testSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
  }

  const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
  const proxyUrl = config?.scanProxyEnabled && config.scanProxyUrl ? config.scanProxyUrl : undefined;

  const scanResult = await scanReviewUrl(result.data.url, { proxyUrl });

  if (!scanResult.success) {
    return NextResponse.json({ error: scanResult.errorMessage || 'Quét thất bại', durationMs: scanResult.durationMs, resolvedUrl: scanResult.resolvedUrl });
  }

  return NextResponse.json({
    success: true,
    foundRating: scanResult.foundRating,
    reviewCount: scanResult.reviewCount,
    durationMs: scanResult.durationMs,
    resolvedUrl: scanResult.resolvedUrl,
  });
}
