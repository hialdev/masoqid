'use client';

import { useState, useEffect } from 'react';
import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmployeeNewEditForm } from '../components/employee-new-edit-form';

import useEmployeeStore from 'src/stores/employee';

type Props = {
   id: string;
};

export function EmployeeEditView({ id }: Props) {
   const { getById } = useEmployeeStore();
   const [currentEmployee, setCurrentEmployee] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchEmployee = async () => {
         try {
            const data = await getById(id);
            setCurrentEmployee(data);
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };

      fetchEmployee();
   }, [id]);

   if (loading) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Edit Employee"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Employee', href: paths.dashboard.employee.root },
               { name: currentEmployee?.user?.name || currentEmployee?.nik || 'Edit' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <EmployeeNewEditForm currentEmployee={currentEmployee} />
      </DashboardContent>
   );
}
