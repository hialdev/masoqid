'use client';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ExampleRichForm } from './components/form';
import { paths } from 'src/routes/al/paths';

export default function ExampleRichCreate() {
   return (
      <>
         <CustomBreadcrumbs
            heading="Create New Event Type"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Example Rich', href: paths.dashboard.example_rich.root }, { name: 'Create' }]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <ExampleRichForm onSuccess={() => console.log('')} />
      </>
   );
}
