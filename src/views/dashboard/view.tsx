'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/al/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';

// Import stores for each model
import useExampleRichStore from 'src/stores/example-rich';
import useUserStore from 'src/stores/user';
import useSettingStore from 'src/stores/setting';

// ----------------------------------------------------------------------

type WidgetItem = {
   title: string;
   path: string;
   icon: string;
   count: number;
   color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
};

// ----------------------------------------------------------------------

export function DashboardView() {
   const [loading, setLoading] = useState(true);
   const [widgets, setWidgets] = useState<WidgetItem[]>([]);

   // Initialize stores
   const exampleRichStore = useExampleRichStore();
   const userStore = useUserStore();
   const settingStore = useSettingStore();

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);

         // Fetch all data from stores and get counts from API responses
         const [
            exampleRichResponse,
            userResponse,
            settingResponse,
         ] = await Promise.allSettled([
            exampleRichStore.all({ page: 1, limit: 1, sort: 'created_at', order: 'desc' }),
            userStore.all({ page: 1, limit: 1, sort: 'created_at', order: 'desc' }),
            settingStore.all(),
         ]);

         // Prepare widgets with data
         const widgetsData: WidgetItem[] = [
            {
               title: 'Example Rich',
               path: paths.dashboard.example_rich.root,
               icon: 'solar:calendar-add-bold-duotone',
               count:
                  exampleRichResponse.status === 'fulfilled' &&
                  exampleRichResponse.value?.data?.pagination?.total
                     ? exampleRichResponse.value.data.pagination.total
                     : 0,
               color: 'warning',
            },
            {
               title: 'Users',
               path: paths.dashboard.users.root,
               icon: 'solar:user-bold-duotone',
               count:
                  userResponse.status === 'fulfilled' && userResponse.value?.data?.pagination?.total
                     ? userResponse.value.data.pagination.total
                     : 0,
               color: 'warning',
            },
            {
               title: 'Settings',
               path: paths.dashboard.settings,
               icon: 'solar:settings-minimalistic-bold-duotone',
               count:
                  settingResponse.status === 'fulfilled' && settingResponse.value?.data?.length
                     ? settingResponse.value.data.length
                     : 0,
               color: 'error',
            },
         ];

         setWidgets(widgetsData);
         setLoading(false);
      };

      fetchData();
   }, []);

   if (loading) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Dashboard"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Grid container spacing={3}>
            {widgets.map((widget, index) => (
               <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                  <Link href={widget.path} underline="none">
                     <Card
                        sx={{
                           height: '100%',
                           display: 'flex',
                           flexDirection: 'column',
                           transition: 'transform 0.3s, box-shadow 0.3s',
                           '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: (theme) => theme.shadows[10],
                           },
                        }}
                     >
                        <CardContent>
                           <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                           >
                              <Stack spacing={1}>
                                 <Typography variant="h6" component="div">
                                    {widget.title}
                                 </Typography>
                                 <Typography variant="h4" component="div">
                                    {widget.count}
                                 </Typography>
                              </Stack>
                              <Avatar
                                 sx={{
                                    width: 56,
                                    height: 56,
                                    bgcolor: `${widget.color}.main`,
                                    color: 'white',
                                 }}
                              >
                                 <Iconify icon={widget.icon} width={28} />
                              </Avatar>
                           </Stack>
                           <Box sx={{ mt: 2 }}>
                              <Chip
                                 label="View Details"
                                 icon={<Iconify icon="solar:alt-arrow-right-outline" />}
                                 variant="soft"
                                 size="small"
                              />
                           </Box>
                        </CardContent>
                     </Card>
                  </Link>
               </Grid>
            ))}
         </Grid>
      </DashboardContent>
   );
}
