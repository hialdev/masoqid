import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { OfficeListView } from 'src/views/dashboard/office/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Offices - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard
         currentPath={`${paths.dashboard.office.root}`}
         requiredPermissions={['Read Office']}
      >
         <OfficeListView />
      </AuthGuard>
   );
}
