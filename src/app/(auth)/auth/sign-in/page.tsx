import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import SignInView from 'src/views/auth/sign-in/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Sign in | Jwt - ${CONFIG.appName}` };

export default function Page() {
  return <SignInView />;
}
