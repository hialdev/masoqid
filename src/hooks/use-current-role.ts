'use client';

import useAuthStore from 'src/stores/auth';

// Hook ringan: ambil role name dari auth store
// Returns: 'Super Admin' | 'Company Owner' | 'Office Manager' | 'Karyawan' | null
export function useCurrentRole(): string | null {
   const user = useAuthStore((state) => state.user);
   // user.role is RoleData { id, name, ... }
   return (user as any)?.role?.name ?? null;
}
