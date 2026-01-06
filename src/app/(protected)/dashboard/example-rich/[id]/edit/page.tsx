import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import ExampleRichEdit from 'src/views/dashboard/example-rich/edit';


// ----------------------------------------------------------------------

export const metadata = {
  title: `Edit Event Type - ${CONFIG.appName}`,
};

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <DashboardContent>
      <ExampleRichEdit id={id} />
    </DashboardContent>
  );
}
