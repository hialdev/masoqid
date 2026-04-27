'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useBoolean } from 'minimal-shared/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { Iconify } from 'src/components/iconify';
import { fDateTime, fDate } from 'src/utils/format-time';

import useAttendanceStore, { Attendance } from 'src/stores/attendance-store';
import useUserStore from 'src/stores/user';
import useOfficeStore from 'src/stores/office';

import AttendanceDetailDialog from 'src/views/dashboard/attendance/attendance-detail-dialog';
import AttendanceTableToolbar from './attendance-table-toolbar';
import { ExportAttendanceDialog } from './components/export-attendance-dialog';
import { CONFIG } from 'src/global-config';

export function AttendanceListView() {
   const { getAllAttendance, attendances } = useAttendanceStore();
   const { all: getAllUsers } = useUserStore();
   const { getAll: getAllOffices } = useOfficeStore();

   const detailDialog = useBoolean();
   const exportDialog = useBoolean();

   const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
   const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
   const [officeOptions, setOfficeOptions] = useState<{ id: string; name: string }[]>([]);

   const [filters, setFilters] = useState({
      start_date: null,
      end_date: null,
      type: 'all',
      status: 'all',
      user_ids: '',
      office_ids: '',
   });

   // Fetch users and offices
   useEffect(() => {
      const fetchData = async () => {
         try {
            // Users
            const userResponse = await getAllUsers({ sort: 'name', order: 'asc' });
            if (userResponse && userResponse.data && Array.isArray(userResponse.data.data)) {
               setEmployeeOptions(
                  userResponse.data.data.map((user: any) => ({ id: user.id, name: user.name }))
               );
            }

            // Offices
            const officeResponse = await getAllOffices({ limit: 1000 });
            if (officeResponse && Array.isArray(officeResponse)) {
               setOfficeOptions(
                  officeResponse.map((office: any) => ({ id: office.id, name: office.name }))
               );
            }
         } catch (error) {
            console.error('Error fetching data:', error);
         }
      };
      fetchData();
   }, [getAllUsers, getAllOffices]);

   const handleFilters = useCallback((name: string, value: any) => {
      setFilters((prevState) => ({
         ...prevState,
         [name]: value,
      }));
   }, []);

   useEffect(() => {
      const params: any = {};
      if (filters.start_date) params.start_date = fDate(filters.start_date);
      if (filters.end_date) params.end_date = fDate(filters.end_date);
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.user_ids) params.user_ids = filters.user_ids;
      if (filters.office_ids) params.office_ids = filters.office_ids;

      getAllAttendance(params);
   }, [getAllAttendance, filters]);

   const handleViewRow = (row: Attendance) => {
      setSelectedAttendance(row);
      detailDialog.onTrue();
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Attendance Report"
            links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Attendance' }]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:export-bold" />}
                  onClick={exportDialog.onTrue}
               >
                  Export Data
               </Button>
            }
            sx={{ mb: 3 }}
         />

         <Card>
            <AttendanceTableToolbar
               filters={filters}
               onFilters={handleFilters}
               typeOptions={['CHECK_IN', 'CHECK_OUT']}
               statusOptions={['VALID', 'SUSPICIOUS', 'INVALID']}
               employeeOptions={employeeOptions}
               officeOptions={officeOptions}
            />

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
               <Scrollbar>
                  <Table sx={{ minWidth: 960 }}>
                     <TableHead>
                        <TableRow>
                           <TableCell>Employee</TableCell>
                           <TableCell>Type</TableCell>
                           <TableCell>Time</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell>Score</TableCell>
                           <TableCell>Photo</TableCell>
                           <TableCell align="center">Action</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {attendances.map((row: Attendance) => (
                           <TableRow key={row.id}>
                              <TableCell>
                                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Avatar
                                       alt={row.user?.name}
                                       src={row.user?.image}
                                       sx={{ mr: 2 }}
                                    />
                                    <Typography variant="body2" noWrap>
                                       {row.user?.name || 'Unknown'}
                                    </Typography>
                                 </Box>
                              </TableCell>
                              <TableCell>
                                 <Label
                                    color={
                                       row.attendance_type === 'CHECK_IN' ? 'primary' : 'warning'
                                    }
                                 >
                                    {row.attendance_type}
                                 </Label>
                              </TableCell>
                              <TableCell>{fDateTime(row.attendance_time)}</TableCell>
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
                                 <Avatar
                                    src={
                                       row.photo_url?.startsWith('http')
                                          ? row.photo_url
                                          : `${CONFIG.apiHostUrl}/${row.photo_url}`
                                    }
                                    variant="rounded"
                                    sx={{ width: 48, height: 48 }}
                                 />
                              </TableCell>
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

            <AttendanceDetailDialog
               open={detailDialog.value}
               onClose={detailDialog.onFalse}
               attendance={selectedAttendance}
            />

            <ExportAttendanceDialog
               open={exportDialog.value}
               onClose={exportDialog.onFalse}
               officeOptions={officeOptions}
               userOptions={employeeOptions}
            />
         </Card>
      </DashboardContent>
   );
}
