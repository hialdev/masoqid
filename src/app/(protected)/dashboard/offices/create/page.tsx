import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { OfficeCreateView } from 'src/views/dashboard/office/create/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Create Office - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard
         currentPath={`${paths.dashboard.office.create}`}
         requiredPermissions={['Add Office']}
      >
         <OfficeCreateView />
      </AuthGuard>
   );
}
