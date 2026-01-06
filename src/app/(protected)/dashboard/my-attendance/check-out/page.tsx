import { AttendanceForm } from 'src/views/dashboard/my-attendance/attendance-form';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function CheckOutPage() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Check Out"
            links={[
               { name: 'Dashboard', href: '/dashboard' },
               { name: 'My Attendance', href: '/dashboard/my-attendance' },
               { name: 'Check Out' },
            ]}
            sx={{ mb: 3 }}
         />
         <AttendanceForm type="CHECK_OUT" />
      </DashboardContent>
   );
}
