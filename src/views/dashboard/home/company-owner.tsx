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
import { LoadingScreen } from 'src/components/loading-screen';

import useAttendanceStore from 'src/stores/attendance-store';
import useOfficeStore from 'src/stores/office';
import useCompanyStore from 'src/stores/company';
import useAuthStore from 'src/stores/auth';

import useEmployeeStore from 'src/stores/employee';
import useShiftStore from 'src/stores/shift';

type WidgetItem = {
   title: string;
   path: string;
   icon: string;
   count: number;
   color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
};

export function CompanyOwnerDashboard() {
   const [loading, setLoading] = useState(true);
   const [widgets, setWidgets] = useState<WidgetItem[]>([]);

   const attendanceStore = useAttendanceStore();
   const officeStore = useOfficeStore();
   const companyStore = useCompanyStore();
   const employeeStore = useEmployeeStore();
   const shiftStore = useShiftStore();
   const { user } = useAuthStore();
 
   const [company, setCompany] = useState<any>(null);
   const [loadingCompany, setLoadingCompany] = useState(false);

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);

         const [attendanceRes, officeRes, employeeRes, shiftRes] = await Promise.allSettled([
            attendanceStore.getAllAttendance(),
            officeStore.getAll(),
            employeeStore.getAll({ limit: 1 }),
            shiftStore.getAllShifts({ limit: 1 }),
         ]);

         const widgetsData: WidgetItem[] = [
            {
               title: 'Offices',
               path: paths.dashboard.office.root,
               icon: 'solar:buildings-2-bold-duotone',
               count: officeRes.status === 'fulfilled' && officeRes.value?.data ? officeRes.value.data.length : 0,
               color: 'info',
            },
            {
               title: 'Attendances',
               path: paths.dashboard.attendance,
               icon: 'solar:clipboard-list-bold-duotone',
               count: attendanceRes.status === 'fulfilled' && attendanceRes.value?.data?.total ? attendanceRes.value.data.total : 0,
               color: 'success',
            },
            {
               title: 'Employees',
               path: paths.dashboard.employee.root,
               icon: 'solar:users-group-two-rounded-bold-duotone',
               count: employeeRes.status === 'fulfilled' && employeeRes.value?.data?.total ? employeeRes.value.data.total : 0,
               color: 'warning',
            },
            {
               title: 'Shifts',
               path: paths.dashboard.shift.root,
               icon: 'solar:calendar-add-bold-duotone',
               count: shiftRes.status === 'fulfilled' && shiftRes.value?.data?.total ? shiftRes.value.data.total : 0,
               color: 'primary',
            },
         ];

         setWidgets(widgetsData);
         setLoading(false);
      };

      fetchData();
 
      if (user?.company) {
         setCompany(user.company);
      } else if (user?.company_id) {
         setLoadingCompany(true);
         companyStore.getById(user.company_id)
            .then(setCompany)
            .catch((err) => {
               console.error('Failed to fetch company details:', err);
               // If permission error, we still have company_id but no details
            })
            .finally(() => setLoadingCompany(false));
      }
   }, [user?.company_id, user?.company]);

   if (loading) return <LoadingScreen />;

   return (
      <>
      <Grid container spacing={3}>
         {widgets.map((widget, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
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
                              <Typography variant="h4" component="div">{widget.count}</Typography>
                           </Stack>
                           <Avatar sx={{ width: 56, height: 56, bgcolor: `${widget.color}.main`, color: 'white' }}>
                              <Iconify icon={widget.icon} width={28} />
                           </Avatar>
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                           <Chip label="View Details" icon={<Iconify icon="solar:alt-arrow-right-outline" />} variant="soft" size="small" />
                        </Box>
                     </CardContent>
                  </Card>
               </Link>
            </Grid>
         ))}
      </Grid>
 
      {company && (
         <Card sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Perusahaan Tergabung</Typography>
            <Grid container spacing={3}>
               <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Avatar 
                     src={company.logo} 
                     alt={company.name} 
                     sx={{ width: 120, height: 120, borderRadius: 2 }} 
                     variant="square"
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 10 }}>
                  <Stack spacing={1}>
                     <Typography variant="h5">{company.name}</Typography>
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Iconify icon="solar:map-point-bold" width={20} />
                        <Typography variant="body2">{company.address}</Typography>
                     </Stack>
                     <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                           <Stack direction="row" spacing={1} alignItems="center">
                              <Iconify icon="solar:phone-bold" width={20} />
                              <Typography variant="body2">{company.phone}</Typography>
                           </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                           <Stack direction="row" spacing={1} alignItems="center">
                              <Iconify icon="solar:letter-bold" width={20} />
                              <Typography variant="body2">{company.email}</Typography>
                           </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                           <Stack direction="row" spacing={1} alignItems="center">
                              <Iconify icon="solar:user-bold" width={20} />
                              <Typography variant="body2">PIC: {company.pic_name}</Typography>
                           </Stack>
                        </Grid>
                     </Grid>
                  </Stack>
               </Grid>
            </Grid>
         </Card>
      )}
   </>
   );
}
