'use client';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/al/paths';
import { useCurrentRole } from 'src/hooks/use-current-role';

import { SuperAdminDashboard } from './home/super-admin';
import { CompanyOwnerDashboard } from './home/company-owner';
import { OfficeManagerDashboard } from './home/office-manager';
import { EmployeeDashboard } from './home/employee';

// ----------------------------------------------------------------------

export function DashboardView() {
   const role = useCurrentRole();

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading={`Dashboard - ${role || 'Employee'}`}
            links={[{ name: 'Dashboard', href: paths.dashboard.root }]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {role === 'Super Admin' && <SuperAdminDashboard />}
         {role === 'Company Owner' && <CompanyOwnerDashboard />}
         {role === 'Office Manager' && <OfficeManagerDashboard />}
         {(!role || role === 'Karyawan') && <EmployeeDashboard />}
      </DashboardContent>
   );
}

