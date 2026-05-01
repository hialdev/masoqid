import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  try {
    // ─── Ambil refreshToken dari cookie dan kirim secara manual ke backend ────
    // NOTE: `credentials: 'include'` tidak berfungsi di server-side Node.js fetch.
    //       Cookie harus dikirim secara eksplisit via header Cookie.
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;
    const accessToken = cookieStore.get('accessToken')?.value;

    const cookieHeader = [
      refreshToken ? `refreshToken=${refreshToken}` : null,
      accessToken ? `accessToken=${accessToken}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[Logout] Backend logout gagal, status:', res.status);
      // Tetap lanjutkan hapus cookie lokal meskipun backend gagal
    }

    const response = NextResponse.json({ success: true });
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.masoq.id';
    response.cookies.set({
      name: 'accessToken',
      value: '',
      maxAge: 0,
      domain: cookieDomain,
      path: '/',
    });
    response.cookies.set({
      name: 'refreshToken',
      value: '',
      maxAge: 0,
      domain: cookieDomain,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Logout] Error:', error);

    const response = NextResponse.json({ success: false }, { status: 200 });
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.masoq.id';
    response.cookies.set({
      name: 'accessToken',
      value: '',
      maxAge: 0,
      domain: cookieDomain,
      path: '/',
    });
    response.cookies.set({
      name: 'refreshToken',
      value: '',
      maxAge: 0,
      domain: cookieDomain,
      path: '/',
    });

    return response;
  }
}
