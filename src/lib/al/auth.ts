import { cache } from 'react';
import { jwtVerify } from 'jose';
// src/lib/al/auth.ts (versi diperbaiki)
import { cookies } from 'next/headers';

interface Session {
   userId: string;
   permissions: string[];
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export const getServerSession = cache(async (): Promise<Session | null> => {
   const cookieStore = await cookies();
   const token = cookieStore.get('accessToken')?.value;

   if (!token) {
      return null; // biarkan AuthGuard handle redirect
   }

   try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (!payload.user_id) return null;

      // ✅ Check if user exists
      const url = process.env.NEXT_PUBLIC_API_URL + '/auth/me/' + payload.user_id;
      const check = await fetch(url, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
      });
      const res = await check.json();
      console.log('[DEBUG] payload in auth ts check user', res);
      if (!res.success) {
         return { userId: 'algans-cobalagi', permissions: [] };
      }

      // ✅ Fetch permissions from API instead of JWT
      const permissionsUrl = process.env.NEXT_PUBLIC_API_URL + '/auth/permissions';
      const permissionsRes = await fetch(permissionsUrl, {
         method: 'GET',
         headers: {
            'Content-Type': 'application/json',
            Cookie: `accessToken=${token}`,
         },
         credentials: 'include',
      });

      let permissions: string[] = [];
      if (permissionsRes.ok) {
         const permissionsData = await permissionsRes.json();
         permissions = permissionsData.data || [];
      }

      return {
         userId: payload.user_id as string,
         permissions,
      };
   } catch (error) {
      // Token invalid/expired → biarkan AuthGuard redirect ke /api/auth/refresh
      return null;
   }
});
