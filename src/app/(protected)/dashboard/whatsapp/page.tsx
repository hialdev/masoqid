import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { DashboardContent } from 'src/layouts/dashboard';
import WhatsappView from 'src/views/dashboard/whatsapp/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard currentPath={`${paths.dashboard.whatsapp}`} requiredPermissions={[]}>
         <DashboardContent>
            <WhatsappView />
         </DashboardContent>
      </AuthGuard>
   );
}
