import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Base64url decode (no external deps, Edge Runtime safe) ──
function b64urlDecode(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── HKDF-SHA256 → 64 bytes (A256CBC-HS512 CEK) ──
async function deriveCEK(secret: string, cookieName: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(cookieName),
      info: enc.encode(`Auth.js Generated Encryption Key (${cookieName})`),
    },
    base,
    512,
  );
  return new Uint8Array(bits);
}

// ── A256CBC-HS512 JWE decryption (RFC 7518 §5.2.2) – zero npm imports ──
async function decryptJWE(token: string, cek: Uint8Array): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 5) return null;

  const [headerB64, encKeyB64, ivB64, ciphertextB64, tagB64] = parts;
  if (encKeyB64 !== "") return null; // must be empty for "dir" alg

  const iv         = b64urlDecode(ivB64);
  const ciphertext = b64urlDecode(ciphertextB64);
  const tag        = b64urlDecode(tagB64);
  const aad        = new TextEncoder().encode(headerB64);

  const macKey = cek.slice(0, 32); // first 256 bits → HMAC key
  const encKey = cek.slice(32);    // last  256 bits → AES key

  // Build MAC input: AAD ‖ IV ‖ ciphertext ‖ AL (AAD bit-length as big-endian uint64)
  const al = new Uint8Array(8);
  new DataView(al.buffer).setUint32(4, (aad.length * 8) >>> 0, false);
  const macInput = new Uint8Array(aad.length + iv.length + ciphertext.length + 8);
  let off = 0;
  macInput.set(aad, off);        off += aad.length;
  macInput.set(iv, off);         off += iv.length;
  macInput.set(ciphertext, off); off += ciphertext.length;
  macInput.set(al, off);

  // HMAC-SHA-512, keep first 32 bytes as the expected tag
  const hmacKey = await crypto.subtle.importKey("raw", macKey, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const mac     = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, macInput));
  const expectedTag = mac.slice(0, 32);

  // Constant-time comparison
  if (tag.length !== expectedTag.length) return null;
  let diff = 0;
  for (let i = 0; i < tag.length; i++) diff |= tag[i] ^ expectedTag[i];
  if (diff !== 0) return null;

  // AES-256-CBC decrypt
  const aesKey    = await crypto.subtle.importKey("raw", encKey, { name: "AES-CBC" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;
}

// ── Read & decrypt the next-auth v5 session JWT from cookie ──
async function getSessionPayload(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secureName   = "__Secure-authjs.session-token";
  const insecureName = "authjs.session-token";

  const secureCookie   = req.cookies.get(secureName)?.value;
  const insecureCookie = req.cookies.get(insecureName)?.value;

  const token      = secureCookie ?? insecureCookie;
  const cookieName = secureCookie ? secureName : insecureName;

  if (!token) return null;

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const cek = await deriveCEK(secret, cookieName);
    return await decryptJWE(token, cek);
  } catch {
    return null;
  }
}

// ── Route configuration ──
const publicRoutes    = ['/', '/pricing', '/case-studies', '/audit', '/login', '/register'];
const publicApiRoutes = ['/api/auth', '/api/pricing', '/api/maps/validate', '/api/cron', '/api/youtube/worker'];
const authRoutes      = ['/login', '/register'];

function redirectUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  return new URL(path, `${proto}://${host}`);
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Allow public API routes without auth check
  const isPublicApi = publicApiRoutes.some(r => pathname.startsWith(r));
  if (isPublicApi) return NextResponse.next();

  const payload    = await getSessionPayload(req);
  const isLoggedIn = !!payload;
  // jwt callback stores role at top level: token.role
  const role = payload?.role as string | undefined;

  // Protect non-public API routes
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute   = authRoutes.includes(pathname);

  // Already logged in on login/register → redirect to correct dashboard
  if (isAuthRoute && isLoggedIn) {
    if (role === 'worker') return NextResponse.redirect(redirectUrl(req, '/worker/dashboard'));
    if (role === 'admin')  return NextResponse.redirect(redirectUrl(req, '/admin'));
    return NextResponse.redirect(redirectUrl(req, '/dashboard'));
  }

  // Not logged in on protected route → redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = redirectUrl(req, '/login');
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (isLoggedIn) {
    if (role === 'client' && (pathname.startsWith('/worker') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(redirectUrl(req, '/dashboard'));
    }
    if (role === 'worker' && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(redirectUrl(req, '/worker/dashboard'));
    }
    if (role === 'admin' && (pathname.startsWith('/dashboard') || pathname.startsWith('/worker'))) {
      return NextResponse.redirect(redirectUrl(req, '/admin'));
    }
  }

  return NextResponse.next();
}



// Fixed regex: properly exclude static files and Next.js internals
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
