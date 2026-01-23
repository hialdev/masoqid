import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { OfficeEditView } from 'src/views/dashboard/office/edit/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Edit Office - ${CONFIG.appName}` };

type Props = {
   params: { id: string };
};

export default function Page({ params }: Props) {
   const { id } = params;

   return (
      <AuthGuard
         currentPath={paths.dashboard.office.edit(id)}
         requiredPermissions={['Update Office']}
      >
         <OfficeEditView id={id} />
      </AuthGuard>
   );
}
