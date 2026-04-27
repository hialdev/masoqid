import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { CompanyListView } from 'src/views/dashboard/company/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Company - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard
         currentPath={paths.dashboard.company.root}
         requiredPermissions={['Read Company']}
      >
         <CompanyListView />
      </AuthGuard>
   );
}
