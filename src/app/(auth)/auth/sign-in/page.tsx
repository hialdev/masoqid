import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/al/paths';
import { getServerSession } from 'src/lib/al/auth';
import SignInView from 'src/views/auth/sign-in/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Sign in | Jwt - ${CONFIG.appName}` };

export default async function Page() {
  const session = await getServerSession();

  if (session && session.userId !== 'algans-cobalagi') {
    redirect(paths.dashboard.root);
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (refreshToken) {
    redirect(`/api/auth/refresh?returnTo=${paths.dashboard.root}`);
  }

  return <SignInView />;
}
