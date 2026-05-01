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

    // ─── Hapus semua auth cookie ──────────────────────────────────────────────
    const response = NextResponse.json({ success: true });
    response.cookies.delete({
      name: 'accessToken',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      path: '/',
    });
    response.cookies.delete({
      name: 'refreshToken',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Logout] Error:', error);

    // Tetap hapus cookie lokal meskipun error
    const response = NextResponse.json({ success: false }, { status: 200 });
    response.cookies.delete({
      name: 'accessToken',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      path: '/',
    });
    response.cookies.delete({
      name: 'refreshToken',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      path: '/',
    });

    return response;
  }
}
