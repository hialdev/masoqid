import type { Metadata } from 'next';

import { redirect } from 'next/navigation';
import { CONFIG } from 'src/global-config';

import { paths } from 'src/routes/al/paths';


// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: CONFIG.appName,
  description:
    'Smart System for Attendance Management, Shift Management, and Smart Suspicious Detection',
};

export default function Page() {
  return redirect(paths.auth.signIn);
}
    