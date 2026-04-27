'use client';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmployeeNewEditForm } from '../components/employee-new-edit-form';

export function EmployeeCreateView() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Create a new employee profile"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Employee', href: paths.dashboard.employee.root },
               { name: 'New employee' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <EmployeeNewEditForm />
      </DashboardContent>
   );
}
