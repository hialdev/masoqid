import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { CompanyEditView } from 'src/views/dashboard/company/edit/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Edit Company - ${CONFIG.appName}` };

type Props = {
   params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
   const { id } = await params;

   return (
      <AuthGuard
         currentPath={paths.dashboard.company.edit(id)}
         requiredPermissions={['Update Company']}
      >
         <CompanyEditView id={id} />
      </AuthGuard>
   );
}
