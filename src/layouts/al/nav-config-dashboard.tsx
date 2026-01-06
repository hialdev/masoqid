import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/al/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name: string) => <Iconify icon={name} />;

// ----------------------------------------------------------------------

/**
 * Input nav data is an array of navigation section items used to define the structure and content of a navigation bar.
 * Each section contains a subheader and an array of items, which can include nested children items.
 *
 * Each item can have the following properties:
 * - `title`: The title of the navigation item.
 * - `path`: The URL path the item links to.
 * - `icon`: An optional icon component to display alongside the title.
 * - `info`: Optional additional information to display, such as a label.
 * - `allowedRoles`: An optional array of roles that are allowed to see the item.
 * - `caption`: An optional caption to display below the title.
 * - `children`: An optional array of nested navigation items.
 * - `disabled`: An optional boolean to disable the item.
 * - `deepMatch`: An optional boolean to indicate if the item should match subpaths.
 */
export const navData: NavSectionProps['data'] = [
   /**
    * Overview
    */
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
   /**
    * Attendance
    */
   {
      subheader: 'Attendance System',
      items: [
         {
            title: 'My Attendance',
            path: paths.dashboard.my_attendance.root,
            icon: icon('solar:user-hand-up-bold-duotone'),
         },
         {
            title: 'Attendance Report',
            path: paths.dashboard.attendance,
            icon: icon('solar:clipboard-list-bold-duotone'),
            // In real app, restrict this to 'manager' role
            // allowedRoles: ['manager', 'admin'],
         },
      ],
   },
   /**
    * CRUD Management
    */
   {
      subheader: 'Content Management',
      items: [
         {
            title: 'Example Rich',
            path: paths.dashboard.example_rich.root,
            icon: icon('solar:calendar-add-bold-duotone'),
            children: [
               { title: 'Lists', path: paths.dashboard.example_rich.root },
               { title: 'Create', path: paths.dashboard.example_rich.create },
            ],
         },
      ],
   },
   /**
    * Management
    */
   {
      subheader: 'Core Settings',
      items: [
         // {
         //    title: 'Dataset Generator',
         //    path: paths.dashboard.crud.root,
         //    icon: icon('solar:database-bold-duotone'),
         //    children: [
         //       { title: 'List', path: paths.dashboard.crud.root },
         //       { title: 'Create', path: paths.dashboard.crud.new },
         //    ],
         // },
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
