import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import AccessView from 'src/views/dashboard/user/access/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Access Control - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard currentPath={`${paths.dashboard.users.access}`} requiredPermissions={[]}>
         <AccessView />
      </AuthGuard>
   );
}
