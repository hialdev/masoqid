import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { paths } from 'src/routes/al/paths';


// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'EMA - Hadir | Absence Management App',
  description:
    'This is an Absence Management App for EMA - Hadir, manage all contents of official sites and web apps',
};

export default function Page() {
  return redirect(paths.dashboard.root);
}
    