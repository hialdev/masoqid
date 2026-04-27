import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ─── Rute yang memerlukan autentikasi ────────────────────────────────────────
const PROTECTED_PATHS = ['/dashboard'];

// ─── Rute halaman autentikasi (sign-in, sign-up, dst.) ───────────────────────
const AUTH_PAGES = ['/auth/sign-in', '/auth/sign-up', '/auth/verify', '/auth/refresh'];

// ─── Rute yang tidak boleh diproses oleh middleware (infinite loop guard) ────
const SKIP_PATHS = ['/api/auth/refresh', '/api/auth/logout', '/_next', '/favicon'];

// ────────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ─── Lewati path internal / API handler ──────────────────────────────────
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Flag: datang dari proses refresh yang sudah gagal → jangan loop lagi
  const fromRefreshFailed = searchParams.get('from') === 'refresh-failed';

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // ─── [A] Rute protected ───────────────────────────────────────────────────
  if (isProtected) {
    if (accessToken) {
      // Ada accessToken → izinkan, verifikasi JWT dilakukan di Server Component
      return NextResponse.next();
    }

    if (refreshToken) {
      // Tidak ada accessToken tapi ada refreshToken → coba refresh dulu
      const refreshUrl = new URL('/api/auth/refresh', request.url);
      refreshUrl.searchParams.set('returnTo', pathname);
      console.log('[Middleware] Protected route, no accessToken → refresh:', refreshUrl.href);
      return NextResponse.redirect(refreshUrl);
    }

    // Tidak ada token sama sekali → langsung ke sign-in dengan flag
    const signInUrl = new URL('/auth/sign-in', request.url);
    signInUrl.searchParams.set('from', 'refresh-failed');
    console.log('[Middleware] Protected route, no tokens → sign-in');
    return NextResponse.redirect(signInUrl);
  }

  // ─── [B] Halaman auth ─────────────────────────────────────────────────────
  if (isAuthPage) {
    if (accessToken) {
      // Sudah punya accessToken yang ada → arahkan ke dashboard
      // (validasi JWT tetap di getServerSession di Server Component)
      console.log('[Middleware] Auth page, accessToken exists → dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Tidak ada accessToken, ada refreshToken, dan BELUM dari refresh-failed
    // → coba refresh sekali
    if (refreshToken && !fromRefreshFailed && !pathname.includes('/auth/refresh')) {
      const refreshUrl = new URL('/api/auth/refresh', request.url);
      refreshUrl.searchParams.set('returnTo', '/dashboard');
      console.log('[Middleware] Auth page + refreshToken → try refresh:', refreshUrl.href);
      return NextResponse.redirect(refreshUrl);
    }

    // fromRefreshFailed = true OR tidak ada token → tampilkan halaman auth
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Matcher: protected routes dan auth pages
  // Exclude static files, _next, api routes (ditangani manual di atas)
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};
