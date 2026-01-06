import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { DashboardContent } from 'src/layouts/dashboard';
import { ProfileView } from 'src/views/dashboard/my-account/profil-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `My Account - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard currentPath={`${paths.dashboard.account.root}`} requiredPermissions={[]}>
            <DashboardContent>
               <ProfileView />
            </DashboardContent>
         </AuthGuard>
   );
}
