import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import ExampleRichCreate from 'src/views/dashboard/example-rich/create';


// ----------------------------------------------------------------------

export const metadata = {
  title: `Create Event Type - ${CONFIG.appName}`,
};

export default function Page() {
  return (
    <DashboardContent>
      <ExampleRichCreate />
    </DashboardContent>
  );
}
