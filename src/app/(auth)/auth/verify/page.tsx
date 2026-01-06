import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { VerifyView } from 'src/views/auth/verify/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Verify OTP | Jwt - ${CONFIG.appName}` };

export default function Page() {
  return <VerifyView />;
}
