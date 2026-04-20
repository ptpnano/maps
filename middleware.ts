import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware configuration for edge runtime
const authConfig = {
  providers: [], // no DB here
  pages: {
    signIn: '/login',
  },
};

const { auth } = NextAuth(authConfig);

const publicRoutes = ['/', '/pricing', '/case-studies', '/audit', '/login', '/register'];
const publicApiRoutes = ['/api/auth', '/api/pricing', '/api/maps/validate', '/api/cron'];
const authRoutes = ['/login', '/register'];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;
  
  // Allow public API routes
  const isPublicApi = publicApiRoutes.some(r => pathname.startsWith(r));
  if (isPublicApi) {
    return NextResponse.next();
  }

  // Allow all other API routes only if logged in
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);

  // If on login/register and already logged in → redirect to dashboard
  if (isAuthRoute) {
    if (isLoggedIn) {
      const role = req.auth?.user?.role;
      if (role === 'worker') return NextResponse.redirect(new URL('/worker/dashboard', nextUrl));
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', nextUrl));
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Not logged in and not public → redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Role-based route protection
  if (isLoggedIn) {
    const role = req.auth?.user?.role;
    
    if (role === 'client' && (pathname.startsWith('/worker') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    
    if (role === 'worker' && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/worker/dashboard', nextUrl));
    }
    
    if (role === 'admin' && (pathname.startsWith('/dashboard') || pathname.startsWith('/worker'))) {
      return NextResponse.redirect(new URL('/admin', nextUrl));
    }
  }

  return NextResponse.next();
});

// Fixed regex: properly exclude static files and Next.js internals
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
