'use client';

import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { usePathname, useSearchParams } from 'src/routes/hooks';

import useAuthStore from 'src/stores/auth';
import { _userAbout, _userFeeds, _userFriends, _userGallery, _userFollowers } from 'src/_mock';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ProfileHome } from 'src/sections/user/profile-home';
import { ProfileCover } from 'src/sections/user/profile-cover';
import { ProfileFriends } from 'src/sections/user/profile-friends';
import { ProfileGallery } from 'src/sections/user/profile-gallery';
import { ProfileFollowers } from 'src/sections/user/profile-followers';
import { ComingSoonView } from 'src/sections/coming-soon/view';
import ProfileForm from './components/profile-form';
import { Typography } from '@mui/material';
import { ProfileData } from 'src/stores/profile';
import AccessForm from './components/access-form';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
   {
      value: '',
      label: 'Profile',
      icon: <Iconify width={24} icon="solar:user-id-bold" />,
   },
   {
      value: 'access',
      label: 'Access',
      icon: <Iconify width={24} icon="solar:lock-bold" />,
   },
];

// ----------------------------------------------------------------------

const TAB_PARAM = 'tab';

export function ProfileView() {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const selectedTab = searchParams.get(TAB_PARAM) ?? '';

   const { user } = useAuthStore();

   const [searchFriends, setSearchFriends] = useState('');

   const handleSearchFriends = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchFriends(event.target.value);
   }, []);

   const createRedirectPath = (currentPath: string, query: string) => {
      const queryString = new URLSearchParams({ [TAB_PARAM]: query }).toString();
      return query ? `${currentPath}?${queryString}` : currentPath;
   };

   return (
      <>
         <CustomBreadcrumbs
            heading="Profile"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'My Account' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card sx={{ height: 290 }}>
            <ProfileCover
               role={user?.role?.name ?? ''}
               name={user?.name ?? ''}
               username={user?.username ?? ''}
               avatarUrl={user?.image ? process.env.NEXT_PUBLIC_API_HOST + '/' + user.image : ''}
               coverUrl={_userAbout.coverUrl}
            />

            <Box
               sx={{
                  width: 1,
                  bottom: 0,
                  zIndex: 9,
                  px: { md: 3 },
                  display: 'flex',
                  position: 'absolute',
                  bgcolor: 'background.paper',
                  justifyContent: { xs: 'center', md: 'flex-end' },
               }}
            >
               <Tabs value={selectedTab}>
                  {NAV_ITEMS.map((tab) => (
                     <Tab
                        component={RouterLink}
                        key={tab.value}
                        value={tab.value}
                        icon={tab.icon}
                        label={tab.label}
                        href={createRedirectPath(pathname, tab.value)}
                     />
                  ))}
               </Tabs>
            </Box>
         </Card>

         {selectedTab === '' && (
            <Box sx={{ mt: 3 }}>
               <Typography typography={`h6`}>Edit Profile</Typography>
               <ProfileForm currentUser={user as ProfileData || null} />
            </Box>
         )}

         {selectedTab === 'access' && (
            <Box sx={{ mt: 3 }}>
               <Typography typography={`h6`} sx={{ mb: 3 }}>Edit Access</Typography>
               <AccessForm currentUser={user as ProfileData || null} />
            </Box>
         )}
      </>
   );
}
