import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/al/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name: string) => <Iconify icon={name} />;

// ── Super Admin ───────────────────────────────────────────────────────────────
const navSuperAdmin: NavSectionProps['data'] = [
   {
      subheader: 'Overview',
      items: [
         {
            title: 'Dashboard',
            path: paths.dashboard.root,
            icon: icon('solar:widget-5-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Core Settings',
      items: [
         {
            title: 'Company',
            path: paths.dashboard.company.root,
            icon: icon('solar:buildings-bold-duotone'),
         },
         {
            title: 'User Access',
            path: paths.dashboard.users.root,
            icon: icon('solar:user-bold-duotone'),
            children: [
               { title: 'Users', path: paths.dashboard.users.root },
               { title: 'Access Control', path: paths.dashboard.users.access },
            ],
         },
         {
            title: 'Settings',
            path: paths.dashboard.settings,
            icon: icon('solar:settings-minimalistic-bold-duotone'),
         },
         {
            title: 'Whatsapp Integration',
            path: paths.dashboard.whatsapp,
            icon: icon('solar:smartphone-2-bold-duotone'),
         },
      ],
   },
];

// ── Company Owner ─────────────────────────────────────────────────────────────
const navCompanyOwner: NavSectionProps['data'] = [
   {
      subheader: 'Overview',
      items: [
         {
            title: 'Dashboard',
            path: paths.dashboard.root,
            icon: icon('solar:widget-5-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Workforce',
      items: [
         {
            title: 'Offices',
            path: paths.dashboard.office.root,
            icon: icon('solar:buildings-2-bold-duotone'),
         },
         {
            title: 'Employees',
            path: paths.dashboard.employee.root,
            icon: icon('solar:users-group-two-rounded-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Time Management',
      items: [
         {
            title: 'Shift Calendar',
            path: paths.dashboard.shift.calendar,
            icon: icon('solar:calendar-bold-duotone'),
         },
         {
            title: 'Manage Shift',
            path: paths.dashboard.shift.root,
            icon: icon('solar:calendar-add-bold-duotone'),
         },
         {
            title: 'Bulk Shift',
            path: paths.dashboard.shift.bulk,
            icon: icon('solar:calendar-mark-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Reports',
      items: [
         {
            title: 'Attendance Report',
            path: paths.dashboard.attendance,
            icon: icon('solar:clipboard-list-bold-duotone'),
         },
         {
            title: 'Salary Report',
            path: paths.dashboard.salary.report,
            icon: icon('solar:wallet-money-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Administration',
      items: [
         {
            title: 'Office Managers',
            path: paths.dashboard.users.officeManagers,
            icon: icon('solar:user-id-bold-duotone'),
         },
      ],
   },
];

// ── Office Manager ────────────────────────────────────────────────────────────
const navOfficeManager: NavSectionProps['data'] = [
   {
      subheader: 'Overview',
      items: [
         {
            title: 'Dashboard',
            path: paths.dashboard.root,
            icon: icon('solar:widget-5-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Workforce',
      items: [
         {
            title: 'Offices',
            path: paths.dashboard.office.root,
            icon: icon('solar:buildings-2-bold-duotone'),
         },
         {
            title: 'Employees',
            path: paths.dashboard.employee.root,
            icon: icon('solar:users-group-two-rounded-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Time Management',
      items: [
         {
            title: 'Shift Calendar',
            path: paths.dashboard.shift.calendar,
            icon: icon('solar:calendar-bold-duotone'),
         },
         {
            title: 'Manage Shift',
            path: paths.dashboard.shift.root,
            icon: icon('solar:calendar-add-bold-duotone'),
         },
         {
            title: 'Bulk Shift',
            path: paths.dashboard.shift.bulk,
            icon: icon('solar:calendar-mark-bold-duotone'),
         },
         {
            title: 'Switch Requests',
            path: paths.dashboard.shift.switchRequests,
            icon: icon('solar:refresh-circle-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Reports',
      items: [
         {
            title: 'Attendance Report',
            path: paths.dashboard.attendance,
            icon: icon('solar:clipboard-list-bold-duotone'),
         },
         {
            title: 'Salary Report',
            path: paths.dashboard.salary.report,
            icon: icon('solar:wallet-money-bold-duotone'),
         },
      ],
   },
];

// ── Karyawan / Employee ───────────────────────────────────────────────────────
const navEmployee: NavSectionProps['data'] = [
   {
      subheader: 'Overview',
      items: [
         {
            title: 'Dashboard',
            path: paths.dashboard.root,
            icon: icon('solar:widget-5-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Attendance',
      items: [
         {
            title: 'My Attendance',
            path: paths.dashboard.my_attendance.root,
            icon: icon('solar:user-hand-up-bold-duotone'),
            children: [
               { title: 'Check In', path: paths.dashboard.my_attendance.check_in },
               { title: 'Check Out', path: paths.dashboard.my_attendance.check_out },
            ],
         },
      ],
   },
   {
      subheader: 'Schedule',
      items: [
         {
            title: 'My Shifts',
            path: paths.dashboard.shift.my,
            icon: icon('solar:user-check-rounded-bold-duotone'),
         },
      ],
   },
   {
      subheader: 'Request',
      items: [
         {
            title: 'Switch Shift',
            path: paths.dashboard.shift.switchRequests,
            icon: icon('solar:refresh-circle-bold-duotone'),
         },
      ],
   },
];

// ── Selector function ─────────────────────────────────────────────────────────
export function getNavDataByRole(roleName: string | null): NavSectionProps['data'] {
   switch (roleName) {
      case 'Super Admin':
         return navSuperAdmin;
      case 'Company Owner':
         return navCompanyOwner;
      case 'Office Manager':
         return navOfficeManager;
      case 'Karyawan':
         return navEmployee;
      default:
         return navEmployee; // fallback aman
   }
}

// Backward-compat export (digunakan layout saat role belum diketahui)
export const navData: NavSectionProps['data'] = navEmployee;
