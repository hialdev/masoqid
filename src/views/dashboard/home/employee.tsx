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
import { Iconify } from 'src/components/iconify';

type WidgetItem = {
   title: string;
   path: string;
   icon: string;
   color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
   description: string;
};

export function EmployeeDashboard() {
   const [widgets, setWidgets] = useState<WidgetItem[]>([]);

   useEffect(() => {
      const widgetsData: WidgetItem[] = [
         {
            title: 'My Attendance',
            path: paths.dashboard.my_attendance.root,
            icon: 'solar:user-hand-up-bold-duotone',
            color: 'success',
            description: 'Log your daily check-in and check-out',
         },
         {
            title: 'My Shifts',
            path: paths.dashboard.shift.my,
            icon: 'solar:user-check-rounded-bold-duotone',
            color: 'primary',
            description: 'View your upcoming schedule',
         },
         {
            title: 'Switch Requests',
            path: paths.dashboard.shift.switchRequests,
            icon: 'solar:refresh-circle-bold-duotone',
            color: 'secondary',
            description: 'Manage your shift switch requests',
         },
      ];

      setWidgets(widgetsData);
   }, []);

   return (
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
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: (theme) => theme.shadows[10] },
                     }}
                  >
                     <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                           <Stack spacing={1}>
                              <Typography variant="h6" component="div">{widget.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{widget.description}</Typography>
                           </Stack>
                           <Avatar sx={{ width: 56, height: 56, bgcolor: `${widget.color}.main`, color: 'white' }}>
                              <Iconify icon={widget.icon} width={28} />
                           </Avatar>
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                           <Chip label="Go to Page" icon={<Iconify icon="solar:alt-arrow-right-outline" />} variant="soft" size="small" />
                        </Box>
                     </CardContent>
                  </Card>
               </Link>
            </Grid>
         ))}
      </Grid>
   );
}
