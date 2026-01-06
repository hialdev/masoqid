import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { DashboardContent } from 'src/layouts/dashboard';
import { ExampleRichListView } from 'src/views/dashboard/example-rich/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Example Rich - ${CONFIG.appName}` };

export default function Page() {
   return (
      <AuthGuard currentPath={`${paths.dashboard.example_rich.root}`} requiredPermissions={[]}>
         <DashboardContent>
            <ExampleRichListView />
         </DashboardContent>
      </AuthGuard>
   );
}
