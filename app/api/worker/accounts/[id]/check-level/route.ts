import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'worker' || (session.user as any).workerStatus !== 'approved') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await db.workerAccount.findFirst({
      where: { id, workerId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.profileUrl) {
      return NextResponse.json({ error: "Chưa có link profile. Vui lòng thêm link Google Maps profile trước." }, { status: 400 });
    }

    // SSRF protection: resolve short URLs then validate against allowlist
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(account.profileUrl);
    } catch {
      return NextResponse.json({ error: "URL profile không hợp lệ." }, { status: 400 });
    }

    const shortUrlHosts = ['maps.app.goo.gl', 'goo.gl'];
    const allowedHosts = ['www.google.com', 'google.com', 'maps.google.com'];
    let fetchUrl = account.profileUrl;

    // Resolve short URL to full URL before SSRF check
    if (shortUrlHosts.includes(parsedUrl.hostname)) {
      try {
        const resolveRes = await fetch(account.profileUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        });
        fetchUrl = resolveRes.url;
        parsedUrl = new URL(fetchUrl);
      } catch {
        return NextResponse.json({
          error: "Không thể truy cập link rút gọn. Vui lòng dùng link profile đầy đủ.",
          currentLevel: account.level,
        }, { status: 422 });
      }
    }

    if (!allowedHosts.includes(parsedUrl.hostname) || !parsedUrl.pathname.startsWith('/maps')) {
      return NextResponse.json({ error: "URL profile phải là link Google Maps hợp lệ (google.com/maps/...)." }, { status: 400 });
    }

    // Attempt to fetch and parse level from Google Maps profile
    let detectedLevel: number | null = null;
    try {
      const res = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      if (res.ok) {
        const html = await res.text();
        // Try multiple patterns to find Local Guide level
        const levelMatch =
          html.match(/"contributorLevel"\s*:\s*(\d+)/i) ||
          html.match(/"localGuideLevel"\s*:\s*(\d+)/i) ||
          html.match(/"level"\s*:\s*(\d+)/i) ||
          html.match(/Local\s+Guide[^<]*Level\s+(\d+)/i) ||
          html.match(/Level\s+(\d+)[^<]*Local\s+Guide/i) ||
          html.match(/Cấp\s+(\d+)/i) ||
          html.match(/Level\s+(\d+)/i);
        if (levelMatch) {
          const parsed = parseInt(levelMatch[1]);
          if (parsed >= 1 && parsed <= 10) detectedLevel = parsed;
        }
      }
    } catch {
      // Network error or timeout — return helpful message
      return NextResponse.json({
        error: "Không thể truy cập profile. Có thể Google đang chặn. Vui lòng nhập level thủ công.",
        currentLevel: account.level,
      }, { status: 422 });
    }

    if (detectedLevel === null) {
      return NextResponse.json({
        error: "Không thể tự động phát hiện level. Vui lòng kiểm tra và nhập thủ công.",
        currentLevel: account.level,
      }, { status: 422 });
    }

    // Update level in DB
    const updated = await db.workerAccount.update({
      where: { id },
      data: { level: detectedLevel },
    });

    return NextResponse.json({ success: true, level: detectedLevel, account: updated });
  } catch (error) {
    console.error("Check level error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
