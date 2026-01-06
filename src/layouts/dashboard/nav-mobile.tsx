import type { NavSectionProps } from 'src/components/nav-section';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';

import useSettingStore from 'src/stores/setting';

import { Scrollbar } from 'src/components/scrollbar';
import { NavSectionVertical } from 'src/components/nav-section';

import { layoutClasses } from '../core';
import { NavUpgrade } from '../components/nav-upgrade';

// ----------------------------------------------------------------------

type NavMobileProps = NavSectionProps & {
   open: boolean;
   onClose: () => void;
   slots?: {
      topArea?: React.ReactNode;
      bottomArea?: React.ReactNode;
   };
};

export function NavMobile({
   sx,
   data,
   open,
   slots,
   onClose,
   className,
   checkPermissions,
   ...other
}: NavMobileProps) {
   const pathname = usePathname();
   const settingStore = useSettingStore();
   const [logoUrl, setLogoUrl] = useState<string>('');
   useEffect(() => {
      const fetchLogo = async () => {
         const logoFetch = await settingStore.getKey('dash.logo');

         if (logoFetch && process.env.NEXT_PUBLIC_API_HOST) {
            setLogoUrl(`${process.env.NEXT_PUBLIC_API_HOST}/${logoFetch.set_value}`);
         }
      };

      fetchLogo();
   }, []);

   useEffect(() => {
      if (open) {
         onClose();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [pathname]);

   return (
      <Drawer
         open={open}
         onClose={onClose}
         slotProps={{
            paper: {
               className: mergeClasses([
                  layoutClasses.nav.root,
                  layoutClasses.nav.vertical,
                  className,
               ]),
               sx: [
                  {
                     overflow: 'unset',
                     bgcolor: 'var(--layout-nav-bg)',
                     width: 'var(--layout-nav-mobile-width)',
                  },
                  ...(Array.isArray(sx) ? sx : [sx]),
               ],
            },
         }}
      >
         {slots?.topArea ?? (
            <Box sx={{ pl: 3.5, pt: 2.5, pb: 1 }}>
               {/* <Logo /> */}
               <Image
                  src={logoUrl || process.env.NEXT_PUBLIC_APP_URL + '/logo/rkgtour.webp'}
                  alt="Dashboard Logo"
                  width={120}
                  height={40}
                  style={{ width: '100%', objectFit: 'contain', objectPosition: 'left' }}
               />
            </Box>
         )}

         <Scrollbar fillContent>
            <NavSectionVertical
               data={data}
               checkPermissions={checkPermissions}
               sx={{ px: 2, flex: '1 1 auto' }}
               {...other}
            />
            {slots?.bottomArea ?? <NavUpgrade />}
         </Scrollbar>
      </Drawer>
   );
}
