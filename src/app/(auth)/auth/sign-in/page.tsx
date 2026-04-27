import type { Metadata } from 'next';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/al/paths';
import { getServerSession } from 'src/lib/al/auth';
import SignInView from 'src/views/auth/sign-in/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Sign in | Jwt - ${CONFIG.appName}` };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ─── 1. Jika sudah punya session valid → langsung ke dashboard ───────────
  const session = await getServerSession();
  if (session && session.userId !== 'algans-cobalagi') {
    redirect(paths.dashboard.root);
  }

  const params = await searchParams;
  // ─── 2. Jika datang dari refresh yang gagal → tampilkan form langsung ────
  //        JANGAN redirect ke /api/auth/refresh lagi → ini yang menyebabkan loop
  const fromRefreshFailed = params?.from === 'refresh-failed';
  if (fromRefreshFailed) {
    return <SignInView />;
  }

  // ─── 3. Jika ada refreshToken dan belum dari refresh-failed → coba refresh ─
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;
  if (refreshToken) {
    redirect(`/api/auth/refresh?returnTo=${encodeURIComponent(paths.dashboard.root)}`);
  }

  // ─── 4. Tidak ada token sama sekali → tampilkan form login ───────────────
  return <SignInView />;
}
