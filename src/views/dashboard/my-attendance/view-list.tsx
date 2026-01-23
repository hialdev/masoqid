'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import useAttendanceStore, { Attendance } from 'src/stores/attendance-store';
import { fDateTime } from 'src/utils/format-time';
import { fDate } from 'src/utils/format-time';
import AttendanceTableToolbar from 'src/views/dashboard/attendance/attendance-table-toolbar';
import LocationCell from 'src/views/dashboard/attendance/location-cell';

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Iconify } from 'src/components/iconify';
import { useBoolean } from 'minimal-shared/hooks';
import AttendanceDetailDialog from 'src/views/dashboard/attendance/attendance-detail-dialog';

export function MyAttendanceListView() {
   const router = useRouter();
   const { getMyAttendance, myAttendances } = useAttendanceStore();
   const detailDialog = useBoolean();
   const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

   const [filters, setFilters] = useState({
      start_date: null as Date | null,
      end_date: null as Date | null,
      type: '',
      status: '',
   });

   const handleFilters = useCallback((name: string, value: any) => {
      setFilters((prevState) => ({
         ...prevState,
         [name]: value,
      }));
   }, []);

   const handleViewRow = useCallback(
      (row: Attendance) => {
         setSelectedAttendance(row);
         detailDialog.onTrue();
      },
      [detailDialog]
   );

   useEffect(() => {
      const params: any = {};
      if (filters.start_date) params.start_date = fDate(filters.start_date, 'YYYY-MM-DD');
      if (filters.end_date) params.end_date = fDate(filters.end_date, 'YYYY-MM-DD');
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.status && filters.status !== 'all') params.status = filters.status;

      getMyAttendance(params);
   }, [getMyAttendance, filters]);

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="My Attendance"
            links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'My Attendance' }]}
            action={
               <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={() => router.push('/dashboard/my-attendance/check-in')}
                  >
                     Check In
                  </Button>
                  <Button
                     variant="contained"
                     color="warning"
                     onClick={() => router.push('/dashboard/my-attendance/check-out')}
                  >
                     Check Out
                  </Button>
               </Box>
            }
            sx={{ mb: 3 }}
         />

         <Card>
            <AttendanceTableToolbar
               filters={filters}
               onFilters={handleFilters}
               typeOptions={['CHECK_IN', 'CHECK_OUT']}
               statusOptions={['VALID', 'SUSPICIOUS', 'INVALID']}
            />

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
               <Scrollbar>
                  <Table sx={{ minWidth: 800 }}>
                     <TableHead>
                        <TableRow>
                           <TableCell>Date/Time</TableCell>
                           <TableCell>Type</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell>Score</TableCell>
                           <TableCell>Location</TableCell>
                           <TableCell>Accuracy</TableCell>
                           <TableCell align="center">Action</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {myAttendances.map((row: Attendance) => (
                           <TableRow key={row.id}>
                              <TableCell>{fDateTime(row.attendance_time)}</TableCell>
                              <TableCell>
                                 <Label
                                    color={
                                       row.attendance_type === 'CHECK_IN' ? 'primary' : 'warning'
                                    }
                                 >
                                    {row.attendance_type}
                                 </Label>
                              </TableCell>
                              <TableCell>
                                 <Label
                                    color={
                                       row.status === 'VALID'
                                          ? 'success'
                                          : row.status === 'SUSPICIOUS'
                                            ? 'warning'
                                            : 'error'
                                    }
                                 >
                                    {row.status}
                                 </Label>
                              </TableCell>
                              <TableCell>{row.suspicious_score}</TableCell>
                              <TableCell>
                                 <LocationCell
                                    lat={row.latitude}
                                    lng={row.longitude}
                                    accuracy={row.location_accuracy}
                                 />
                              </TableCell>
                              <TableCell>{row.location_accuracy?.toFixed(1) || 0} m</TableCell>
                              <TableCell align="center">
                                 <Tooltip title="View Details">
                                    <IconButton onClick={() => handleViewRow(row)}>
                                       <Iconify icon="solar:eye-bold" />
                                    </IconButton>
                                 </Tooltip>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </Scrollbar>
            </TableContainer>
         </Card>

         <AttendanceDetailDialog
            open={detailDialog.value}
            onClose={detailDialog.onFalse}
            attendance={selectedAttendance}
         />
      </DashboardContent>
   );
}
