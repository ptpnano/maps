import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";

const validateSchema = z.object({
  url: z.string().url()
});

function extractPlaceNameFromUrl(url: string): string | null {
  try {
    // Pattern: /place/PLACE_NAME/ or /place/PLACE_NAME/@lat,lng
    const placeMatch = url.match(/\/place\/([^/@?&]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
    // Pattern: q=PLACE_NAME in query string
    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      return decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
    }
    return null;
  } catch {
    return null;
  }
}

async function extractPlaceNameFromHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    if (!html || html.length < 100) return null;

    // Try <title> tag: "Place Name - Google Maps"
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      // Remove " - Google Maps" suffix
      const cleaned = title.replace(/\s*[-–]\s*Google\s+Maps$/i, '').trim();
      if (cleaned && cleaned.length > 1 && cleaned !== 'Google Maps') {
        return cleaned;
      }
    }

    // Try og:title meta tag
    const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) {
      const ogTitle = ogMatch[1].trim().replace(/\s*[-–]\s*Google\s+Maps$/i, '').trim();
      if (ogTitle && ogTitle.length > 1) return ogTitle;
    }

    // Try structured data "name":"..."
    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (name.length > 1) return name;
    }

    return null;
  } catch {
    return null;
  }
}

function extractPlaceIdFromUrl(url: string): string | null {
  // Pattern 1: ?place_id=... or &place_id=...
  const placeIdMatch = url.match(/[?&]place_id=([^&]+)/);
  if (placeIdMatch) return placeIdMatch[1];

  // Pattern 2: /place/.../@.../data=...!1s(PLACE_ID)
  // Google Maps embeds place IDs in the data parameter like !1s0x...:0x...
  const dataMatch = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (dataMatch) return dataMatch[1];

  // Pattern 3: ftid=... (feature ID which maps to a place)
  const ftidMatch = url.match(/ftid=(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (ftidMatch) return ftidMatch[1];

  // Fallback: generate a deterministic hash from the resolved URL's path
  // Use only the /place/NAME/ portion to normalize variants of the same place
  const placePathMatch = url.match(/\/place\/([^/@?]+)/);
  if (placePathMatch) {
    const placePath = decodeURIComponent(placePathMatch[1]).toLowerCase().replace(/\s+/g, '_');
    const hash = createHash('sha256').update(placePath).digest('hex').slice(0, 24);
    return `place_${hash}`;
  }

  // Last resort: hash full URL
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 24);
  return `place_${hash}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = validateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    let { url } = result.data;

    // Basic validation
    if (!url.includes('google.com/maps') && !url.includes('maps.app.goo.gl') && !url.includes('goo.gl/maps')) {
      return NextResponse.json({ error: "Must be a valid Google Maps URL" }, { status: 400 });
    }

    // Resolve short URLs by following redirect
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      try {
        const headRes = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        url = headRes.url;
      } catch {
        return NextResponse.json({ error: "Không thể truy cập URL rút gọn. Vui lòng dùng link đầy đủ." }, { status: 400 });
      }
    }

    const placeName = extractPlaceNameFromUrl(url);
    const placeId = extractPlaceIdFromUrl(url)!;

    // If URL doesn't contain /place/NAME/, try extracting from HTML
    const finalName = placeName || await extractPlaceNameFromHtml(url);

    if (!finalName) {
      return NextResponse.json({ error: "Không thể trích xuất tên địa điểm từ URL. Vui lòng dùng URL có chứa /place/TÊN_ĐỊA_ĐIỂM." }, { status: 400 });
    }

    return NextResponse.json({
      placeId,
      name: finalName,
      address: null,
      lat: null,
      lng: null,
      resolvedUrl: url,
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error("Maps validation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

