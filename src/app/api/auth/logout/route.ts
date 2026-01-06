import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
   try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
         method: 'POST',
         credentials: 'include', // ← kirim cookie ke backend
         cache: 'no-store',
      });

      if (!res.ok) {
         console.error('Logout gagal di backend');
      }

      const response = NextResponse.json({ success: true });
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');

      return response;
   } catch (error) {
      console.error('Error logout:', error);
      return NextResponse.json({ success: false }, { status: 500 });
   }
}
