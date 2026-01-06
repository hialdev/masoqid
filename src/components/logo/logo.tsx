'use client';

import type { LinkProps } from '@mui/material/Link';

import { useEffect, useId, useState } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import { styled, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { logoClasses } from './classes';
import useSettingStore from 'src/stores/setting';
import Image from 'next/image';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
   isSingle?: boolean;
   disabled?: boolean;
};

export function Logo({
   sx,
   disabled,
   className,
   href = '/',
   isSingle = true,
   ...other
}: LogoProps) {
   const theme = useTheme();
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

   const uniqueId = useId();

   const TEXT_PRIMARY = theme.vars.palette.text.primary;
   const PRIMARY_LIGHT = theme.vars.palette.primary.light;
   const PRIMARY_MAIN = theme.vars.palette.primary.main;
   const PRIMARY_DARKER = theme.vars.palette.primary.dark;

   /*
    * OR using local (public folder)
    *
    const singleLogo = (
      <img
        alt="Single logo"
        src={`${CONFIG.assetsDir}/logo/logo-single.svg`}
        width="100%"
        height="100%"
      />
    );

    const fullLogo = (
      <img
        alt="Full logo"
        src={`${CONFIG.assetsDir}/logo/logo-full.svg`}
        width="100%"
        height="100%"
      />
    );
    *
    */

   const singleLogo = (
      <Image
         src={logoUrl || process.env.NEXT_PUBLIC_APP_URL + '/logo/Zeettt.svg'}
         alt="Dashboard Logo"
         width={120}
         height={40}
         style={{ width: '100%', objectFit: 'contain', objectPosition: 'left' }}
      />
   );

   const fullLogo = (
      <Image
         src={logoUrl || process.env.NEXT_PUBLIC_APP_URL + '/logo/Zeettt.svg'}
         alt="Dashboard Logo"
         width={120}
         height={40}
         style={{ width: '100%', objectFit: 'contain', objectPosition: 'left' }}
      />
   );

   return (
      <LogoRoot
         component={RouterLink}
         href={href}
         aria-label="Logo"
         underline="none"
         className={mergeClasses([logoClasses.root, className])}
         sx={[
            {
               width: 40,
               height: 40,
               ...(!isSingle && { width: 102, height: 36 }),
               ...(disabled && { pointerEvents: 'none' }),
            },
            ...(Array.isArray(sx) ? sx : [sx]),
         ]}
         {...other}
      >
         {isSingle ? singleLogo : fullLogo}
      </LogoRoot>
   );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
   flexShrink: 0,
   color: 'transparent',
   display: 'inline-flex',
   verticalAlign: 'middle',
}));
