
import type { AccountDrawerProps } from '../components/account-drawer';

import { paths } from 'src/routes/al/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const _account: AccountDrawerProps['data'] = [
   { label: 'Home', href: paths.dashboard.root, icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
   {
      label: 'Profile',
      href: paths.dashboard.account.root,
      icon: <Iconify icon="custom:profile-duotone" />,
   },
   { label: 'Account settings', href: paths.dashboard.account.setting, icon: <Iconify icon="solar:settings-bold-duotone" /> },
];
