/**
 * Google Maps Review Scanner
 * Fetches and parses a Google Maps URL to find review rating and count.
 * Resolves short URLs (maps.app.goo.gl) by following redirects.
 * Supports multi-proxy (one per line) with random selection.
 */

import { ProxyAgent } from 'undici';

export interface ScanResult {
  success: boolean;
  foundRating?: number;   // e.g. 4 or 5
  reviewCount?: number;
  rawSnippet?: string;    // The text fragment where rating was found
  errorMessage?: string;
  durationMs: number;
  resolvedUrl?: string;
}

// Headers to mimic a real browser
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
};

/**
 * Pick a random proxy from a newline-separated list.
 */
function pickRandomProxy(proxyText: string): string | undefined {
  const proxies = proxyText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  if (proxies.length === 0) return undefined;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

/**
 * Build fetch options with optional proxy support.
 */
function buildFetchOptions(proxyUrl?: string, timeoutMs = 10000): RequestInit {
  const options: any = {
    method: 'GET',
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (proxyUrl) {
    options.dispatcher = new ProxyAgent(proxyUrl);
  }
  return options;
}

/**
 * Resolve a short Google Maps URL to its full URL.
 */
async function resolveUrl(url: string, proxyUrl?: string): Promise<string> {
  const res = await fetch(url, buildFetchOptions(proxyUrl, 10000));
  return res.url;
}

/**
 * Fetch the HTML content of a Google Maps place page.
 */
async function fetchPageHtml(url: string, proxyUrl?: string): Promise<string> {
  const res = await fetch(url, buildFetchOptions(proxyUrl, 15000));
  return res.text();
}

/**
 * Extract star rating and review count from Google Maps HTML.
 * Google encodes ratings in multiple ways; we try several patterns.
 */
function extractRatingFromHtml(html: string): { rating: number | null; reviewCount: number | null; snippet: string | null } {
  // Pattern 1: JSON-like rating in page data  e.g. 4.5,1234
  // Google Maps JS data often has patterns like: [4.5,1234,
  const ratingPattern1 = /\[(\d+\.\d+),(\d+),/g;
  // Pattern 2: aria-label with rating text e.g. "4.5 stars"
  const ratingPattern2 = /aria-label="([\d.]+)\s*(?:sao|stars?|étoiles?)"/i;
  // Pattern 3: structured data  e.g. "ratingValue":"4.5"
  const ratingPattern3 = /"ratingValue"\s*:\s*"?([\d.]+)"?/;
  // Pattern 4: JSON embedded rating pattern
  const ratingPattern4 = /\\\\"([\d.]+)\\\\" stars/;
  // Pattern 5: data-value in rating elements
  const ratingPattern5 = /class="[^"]*rating[^"]*"[^>]*>([\d.]+)<\/span/i;

  let rating: number | null = null;
  let reviewCount: number | null = null;
  let snippet: string | null = null;

  // Try pattern 3 first (most reliable if present)
  const m3 = html.match(ratingPattern3);
  if (m3) {
    const parsed = parseFloat(m3[1]);
    if (parsed >= 1 && parsed <= 5) {
      rating = Math.round(parsed);
      snippet = m3[0];
    }
  }

  // Try pattern 2
  if (!rating) {
    const m2 = html.match(ratingPattern2);
    if (m2) {
      const parsed = parseFloat(m2[1]);
      if (parsed >= 1 && parsed <= 5) {
        rating = Math.round(parsed);
        snippet = m2[0];
      }
    }
  }

  // Try pattern 1
  if (!rating) {
    let m: RegExpExecArray | null;
    while ((m = ratingPattern1.exec(html)) !== null) {
      const parsed = parseFloat(m[1]);
      const count = parseInt(m[2]);
      if (parsed >= 1 && parsed <= 5 && count > 0) {
        rating = Math.round(parsed);
        reviewCount = count;
        snippet = m[0];
        break;
      }
    }
  }

  // Extract review count if not already found
  if (!reviewCount) {
    // Pattern: "1,234 reviews" or "1234 đánh giá"
    const countPatterns = [
      /"userRatingCount"\s*:\s*(\d+)/,
      /(\d[\d,]+)\s*(?:reviews?|đánh giá|avis)/i,
      /totalRatings[^\d]*(\d+)/i,
    ];
    for (const p of countPatterns) {
      const cm = html.match(p);
      if (cm) {
        reviewCount = parseInt(cm[1].replace(/,/g, ''));
        break;
      }
    }
  }

  return { rating, reviewCount, snippet };
}

/**
 * Main scanner function: resolve URL, fetch HTML, parse rating.
 * proxyUrl can be a multi-line string; a random proxy is picked per call.
 */
export async function scanReviewUrl(
  url: string,
  options?: { proxyUrl?: string }
): Promise<ScanResult> {
  const start = Date.now();

  try {
    if (!url) {
      return { success: false, errorMessage: 'No URL provided', durationMs: 0 };
    }

    // Pick a random proxy from multi-line proxy text
    const selectedProxy = options?.proxyUrl ? pickRandomProxy(options.proxyUrl) : undefined;

    // Resolve short URLs
    let resolvedUrl = url;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      try {
        resolvedUrl = await resolveUrl(url, selectedProxy);
      } catch {
        return {
          success: false,
          errorMessage: 'Failed to resolve short URL. URL may be invalid or inaccessible.',
          durationMs: Date.now() - start,
        };
      }
    }

    // Fetch HTML
    const html = await fetchPageHtml(resolvedUrl, selectedProxy);
    const durationMs = Date.now() - start;

    if (!html || html.length < 100) {
      return {
        success: false,
        errorMessage: 'Empty or invalid response from Google Maps',
        durationMs,
        resolvedUrl,
      };
    }

    // Parse rating
    const { rating, reviewCount, snippet } = extractRatingFromHtml(html);

    if (rating !== null) {
      return {
        success: true,
        foundRating: rating,
        reviewCount: reviewCount ?? undefined,
        rawSnippet: snippet ?? undefined,
        durationMs,
        resolvedUrl,
      };
    }

    return {
      success: false,
      errorMessage: 'Could not extract rating from page. Google Maps may have changed its HTML structure.',
      durationMs,
      resolvedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err?.message || 'Unknown scanner error',
      durationMs: Date.now() - start,
    };
  }
}
