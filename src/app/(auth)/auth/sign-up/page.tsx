import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import SignUpView from 'src/views/auth/sign-up/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Verify OTP | Jwt - ${CONFIG.appName}` };

export default function Page() {
  return <SignUpView />;
}
