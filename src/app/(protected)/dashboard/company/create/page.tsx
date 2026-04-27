import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { CompanyCreateView } from 'src/views/dashboard/company/create/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Tambah Company - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard
         currentPath={paths.dashboard.company.create}
         requiredPermissions={['Add Company']}
      >
         <CompanyCreateView />
      </AuthGuard>
   );
}
