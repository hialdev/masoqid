import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { paths } from 'src/routes/al/paths';

import { getServerSession } from 'src/lib/al/auth';

// AuthGuard.tsx
export default async function AuthGuard({
  children,
  currentPath = paths.dashboard.root,
  requiredPermissions = [],
}: {
  children: React.ReactNode;
  currentPath?: string;
  requiredPermissions?: string[];
}) {
  const session = await getServerSession();

  if (!session) {
    // ─── Cek apakah refreshToken ada sebelum mencoba refresh ─────────────────
    // Jika tidak ada refreshToken, jangan ke /api/auth/refresh → itu akan loop.
    // Langsung ke sign-in dengan flag refresh-failed.
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      redirect(`/api/auth/refresh?returnTo=${encodeURIComponent(currentPath)}`);
    } else {
      redirect(`${paths.auth.signIn}?from=refresh-failed`);
    }
  }

  // ─── Sesi invalid (user tidak ditemukan di backend) ──────────────────────
  if (session.userId === 'algans-cobalagi') {
    // Hapus token dari backend secara silent
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        cache: 'no-store',
      });
    } catch {
      // abaikan error, tetap redirect ke sign-in
    }

    redirect(`${paths.auth.signIn}?from=refresh-failed`);
  }

  // ─── Cek permissions ──────────────────────────────────────────────────────
  if (requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((p) => session.permissions.includes(p));
    console.log('[AuthGuard] Check Permissions:', hasAll);
    if (!hasAll) {
      redirect('/unauthorized');
    }
  }

  return <>{children}</>;
}