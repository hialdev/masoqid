'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { NavItemProps, NavSectionProps } from 'src/components/nav-section';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../../core';

import Image from 'next/image';
import { merge } from 'es-toolkit';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';

import { _notifications } from 'src/_mock';
import useSettingStore from 'src/stores/setting';
import { VerticalDivider } from 'src/layouts/dashboard';
import { NavMobile } from 'src/layouts/dashboard/nav-mobile';
import { NavVertical } from 'src/layouts/dashboard/nav-vertical';
import { NavHorizontal } from 'src/layouts/dashboard/nav-horizontal';
import { dashboardLayoutVars, dashboardNavColorVars } from 'src/layouts/dashboard/css-vars';

import { useSettingsContext } from 'src/components/settings';

import { useMockedUser } from 'src/auth/hooks';

import { _account } from '../nav-config-account';
import { Searchbar } from '../../components/searchbar';
import { MenuButton } from '../../components/menu-button';
import { AccountDrawer } from '../../components/account-drawer';
import { SettingsButton } from '../../components/settings-button';
import { NavProfileBottom } from './components/nav-profile-bottom';
import { navData as dashboardNavData } from '../nav-config-dashboard';
import { NotificationsDrawer } from '../../components/notifications-drawer';
import { MainSection, layoutClasses, HeaderSection, LayoutSection } from '../../core';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
   layoutQuery?: Breakpoint;
   slotProps?: {
      header?: HeaderSectionProps;
      nav?: {
         data?: NavSectionProps['data'];
      };
      main?: MainSectionProps;
   };
};

export function DashboardLayout({
   sx,
   cssVars,
   children,
   slotProps,
   layoutQuery = 'lg',
}: DashboardLayoutProps) {
   const theme = useTheme();

   const { user } = useMockedUser();
   
   const settings = useSettingsContext();
   const settingStore = useSettingStore();
   
   const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);
   
   const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
   
   const navData = slotProps?.nav?.data || dashboardNavData;
   
   const isNavMini = settings.state.navLayout === 'mini';
   const isNavHorizontal = settings.state.navLayout === 'horizontal';
   const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';
   
   const canDisplayItemByRole = (allowedRoles: NavItemProps['allowedRoles']): boolean =>
      !allowedRoles?.includes(user?.role);
   
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

   const renderHeader = () => {
      const headerSlotProps: HeaderSectionProps['slotProps'] = {
         container: {
            maxWidth: false,
            sx: {
               ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
               ...(isNavHorizontal && {
                  bgcolor: 'var(--layout-nav-bg)',
                  height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
                  [`& .${iconButtonClasses.root}`]: {
                     color: 'var(--layout-nav-text-secondary-color)',
                  },
               }),
            },
         },
      };

      const headerSlots: HeaderSectionProps['slots'] = {
         topArea: (
            <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
               This is an info Alert.
            </Alert>
         ),
         bottomArea: isNavHorizontal ? (
            <NavHorizontal
               data={navData}
               layoutQuery={layoutQuery}
               cssVars={navVars.section}
               checkPermissions={canDisplayItemByRole}
            />
         ) : null,
         leftArea: (
            <>
               {/** @slot Nav mobile */}
               <MenuButton
                  onClick={onOpen}
                  sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
               />
               <NavMobile
                  data={navData}
                  open={open}
                  onClose={onClose}
                  cssVars={navVars.section}
                  slots={{ bottomArea: <NavProfileBottom /> }}
                  checkPermissions={canDisplayItemByRole}
               />

               {/** @slot Logo */}
               {isNavHorizontal && (
                  // <Logo
                  //    sx={{
                  //       display: 'none',
                  //       [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
                  //    }}
                  // />

                  <Image
                     src={logoUrl || process.env.NEXT_PUBLIC_APP_URL+'/logo/Zeettt.com.svg'}
                     alt="Dashboard Logo"
                     width={120}
                     height={40}
                     style={{width:"100%", objectFit:"contain", objectPosition:"left"}}
                  />
               )}

               {/** @slot Divider */}
               {isNavHorizontal && (
                  <VerticalDivider
                     sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }}
                  />
               )}

               {/** @slot Workspace popover */}
               {/* <WorkspacesPopover
                  data={_workspaces}
                  sx={{ ...(isNavHorizontal && { color: 'var(--layout-nav-text-primary-color)' }) }}
               /> */}
            </>
         ),
         rightArea: (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
               {/** @slot Searchbar */}
               <Searchbar data={navData} />

               {/** @slot Language popover */}
               {/* <LanguagePopover data={allLangs} /> */}

               {/** @slot Notifications popover */}
               {/* <NotificationsDrawer data={_notifications} /> */}

               {/** @slot Contacts popover */}
               {/* <ContactsPopover data={_contacts} /> */}

               {/** @slot Settings button */}
               <SettingsButton />

               {/** @slot Account drawer */}
               <AccountDrawer data={_account} />
            </Box>
         ),
      };

      return (
         <HeaderSection
            layoutQuery={layoutQuery}
            disableElevation={isNavVertical}
            {...slotProps?.header}
            slots={{ ...headerSlots, ...slotProps?.header?.slots }}
            slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
            sx={slotProps?.header?.sx}
         />
      );
   };

   const renderSidebar = () => (
      <NavVertical
         data={navData}
         isNavMini={isNavMini}
         layoutQuery={layoutQuery}
         cssVars={navVars.section}
         checkPermissions={canDisplayItemByRole}
         slots={{ bottomArea: <NavProfileBottom /> }}
         onToggleNav={() =>
            settings.setField(
               'navLayout',
               settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
            )
         }
      />
   );

   const renderFooter = () => null;

   const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

   return (
      <LayoutSection
         /** **************************************
          * @Header
          *************************************** */
         headerSection={renderHeader()}
         /** **************************************
          * @Sidebar
          *************************************** */
         sidebarSection={isNavHorizontal ? null : renderSidebar()}
         /** **************************************
          * @Footer
          *************************************** */
         footerSection={renderFooter()}
         /** **************************************
          * @Styles
          *************************************** */
         cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
         sx={[
            {
               [`& .${layoutClasses.sidebarContainer}`]: {
                  [theme.breakpoints.up(layoutQuery)]: {
                     pl: isNavMini
                        ? 'var(--layout-nav-mini-width)'
                        : 'var(--layout-nav-vertical-width)',
                     transition: theme.transitions.create(['padding-left'], {
                        easing: 'var(--layout-transition-easing)',
                        duration: 'var(--layout-transition-duration)',
                     }),
                  },
               },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
         ]}
      >
         {renderMain()}
      </LayoutSection>
   );
}
