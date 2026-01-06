import { AttendanceForm } from 'src/views/dashboard/my-attendance/attendance-form';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function CheckInPage() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Check In"
            links={[
               { name: 'Dashboard', href: '/dashboard' },
               { name: 'My Attendance', href: '/dashboard/my-attendance' },
               { name: 'Check In' },
            ]}
            sx={{ mb: 3 }}
         />
         <AttendanceForm type="CHECK_IN" />
      </DashboardContent>
   );
}
