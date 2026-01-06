import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { View403 } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `403 Unauthorized! | Get out! - ${CONFIG.appName}` };

export default function UnauthorizedPage() {
  return <View403 />;
}
