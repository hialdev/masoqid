import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { paths } from 'src/routes/al/paths';

// Tangani baik GET maupun POST
export async function GET(req: NextRequest) {
  return handleRefresh(req);
}

export async function POST(req: NextRequest) {
  return handleRefresh(req);
}

// ─── URL sign-in dengan flag "dari refresh yang gagal" ──────────────────────
function signInFailedUrl(): URL {
  return new URL(
    `${paths.auth.signIn}?from=refresh-failed`,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

async function handleRefresh(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? paths.dashboard.root;

  console.log('[Refresh] returnTo:', returnTo);

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // ─── Tidak ada refreshToken → langsung ke sign-in dengan flag ──────────────
  if (!refreshToken) {
    console.log('[Refresh] No refreshToken cookie → redirect to sign-in (failed)');
    return NextResponse.redirect(signInFailedUrl());
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
      cache: 'no-store',
    });

    console.log('[Refresh] backend response status:', res.status);

    if (!res.ok) {
      console.log('[Refresh] backend refresh failed → redirect to sign-in (failed)');
      return NextResponse.redirect(signInFailedUrl());
    }

    const data = await res.json();
    const at: string | undefined = data.data?.access_token;

    console.log('[Refresh] new accessToken obtained:', !!at);

    if (!at) {
      console.log('[Refresh] no access_token in response → redirect to sign-in (failed)');
      return NextResponse.redirect(signInFailedUrl());
    }

    // ─── Refresh berhasil → set cookie baru dan redirect ke returnTo ─────────
    const maxAgeMinutes =
      process.env.NEXT_PUBLIC_COOKIE_AGE && parseInt(process.env.NEXT_PUBLIC_COOKIE_AGE) > 0
        ? parseInt(process.env.NEXT_PUBLIC_COOKIE_AGE)
        : 15;

    const response = NextResponse.redirect(
      new URL(returnTo, process.env.NEXT_PUBLIC_APP_URL)
    );

    response.cookies.set('accessToken', at, {
      httpOnly: process.env.NEXT_PUBLIC_COOKIE_HTTPONLY === 'true',
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NEXT_PUBLIC_COOKIE_SAMESITE === 'strict' ? 'strict' : 'lax',
      path: '/',
      maxAge: maxAgeMinutes * 60,
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
    });

    // Jika backend mengembalikan refreshToken baru, update juga
    const newRefreshToken: string | undefined = data.data?.refresh_token;
    if (newRefreshToken) {
      response.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 hari
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      });
    }

    return response;
  } catch (err) {
    console.error('[Refresh] Exception during refresh:', err);
    return NextResponse.redirect(signInFailedUrl());
  }
}
