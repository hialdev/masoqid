'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom, TablePaginationCustom, useTable } from 'src/components/table';
import { toast } from 'src/components/snackbar';
import Typography from '@mui/material/Typography';

import useShiftSwitchStore from 'src/stores/shift-switch';
import useAuthStore from 'src/stores/auth';
import useShiftStore from 'src/stores/shift';
import { ShiftSwitchDialog } from '../components/shift-switch-dialog';
import { Button } from '@mui/material';

const TABLE_HEAD = [
   { id: 'shift_id', label: 'Shift Details' },
   { id: 'type', label: 'Type' },
   { id: 'old_user', label: 'Previous User' },
   { id: 'new_user', label: 'New User' },
   { id: 'modifier', label: 'Modified By' },
   { id: 'reason', label: 'Reason' },
   { id: 'created_at', label: 'Date Changed' },
];

export function ShiftSwitchRequestsView() {
   const table = useTable({ defaultRowsPerPage: 10 });
   const { logs, getLogs, approveRequest, rejectRequest } = useShiftSwitchStore();
   const { user } = useAuthStore();
   const { shifts, getAllShifts } = useShiftStore();

   const isManager = user?.role?.name === 'Company Owner' || user?.role?.name === 'Office Manager';

   const [switchOpen, setSwitchOpen] = useState(false);

   useEffect(() => {
      getLogs({ page: table.page + 1, limit: table.rowsPerPage });
      if (isManager) {
         getAllShifts({ limit: 1000 });
      }
   }, [table.page, table.rowsPerPage, isManager, getLogs, getAllShifts]);

   const displayData = logs;

   const handleApprove = async (id: string) => {
      try {
         await approveRequest(id, 'Approved from Dashboard');
         toast.success('Request approved successfully');
      } catch (err: any) {
         toast.error(err?.response?.data?.message || 'Failed to approve request');
      }
   };

   const handleReject = async (id: string) => {
      try {
         await rejectRequest(id, 'Rejected from Dashboard');
         toast.success('Request rejected successfully');
      } catch (err: any) {
         toast.error(err?.response?.data?.message || 'Failed to reject request');
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Shift History & Logs"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Shift', href: paths.dashboard.shift.root },
               { name: 'Switch Requests' },
            ]}
            action={
               isManager && (
                  <Button
                     variant="contained"
                     startIcon={<Iconify icon="solar:transfer-horizontal-bold-duotone" />}
                     onClick={() => setSwitchOpen(true)}
                  >
                     Buat Pertukaran Shift
                  </Button>
               )
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
               <Scrollbar>
                  <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                     <TableHeadCustom
                        order={table.order}
                        orderBy={table.orderBy}
                        headCells={TABLE_HEAD}
                        onSort={table.onSort}
                     />

                     <TableBody>
                        {displayData.map((row: any) => (
                           <TableRow hover key={row.id}>
                              <TableCell>
                                 {row.shift ? (
                                    <Stack>
                                       <Typography variant="body2">{row.shift.date.slice(0, 10)}</Typography>
                                       <Typography variant="caption" color="text.secondary">
                                          {row.shift.start_time} - {row.shift.end_time}
                                          {row.shift.office && ` · ${row.shift.office.name}`}
                                       </Typography>
                                    </Stack>
                                 ) : '-'}
                              </TableCell>
                              <TableCell>
                                 <Chip 
                                    label={row.type} 
                                    size="small" 
                                    variant="soft"
                                    color={row.type === 'switch' || row.type === 'switch_request' ? 'info' : 'default'}
                                 />
                              </TableCell>
                              <TableCell>{row.old_user?.name || '-'}</TableCell>
                              <TableCell>{row.new_user?.name || '-'}</TableCell>
                              <TableCell>{row.modifier?.name || 'System'}</TableCell>
                              <TableCell>{row.reason || '-'}</TableCell>
                              <TableCell>
                                 <Typography variant="caption">
                                    {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                                 </Typography>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </Scrollbar>
            </TableContainer>

            <TablePaginationCustom
               page={table.page}
               dense={table.dense}
               count={logs.length}
               rowsPerPage={table.rowsPerPage}
               onPageChange={table.onChangePage}
               onRowsPerPageChange={table.onChangeRowsPerPage}
               onChangeDense={table.onChangeDense}
            />
         </Card>

         <ShiftSwitchDialog
            open={switchOpen}
            onClose={() => setSwitchOpen(false)}
            onSuccess={() => {
               getLogs({ page: table.page + 1, limit: table.rowsPerPage });
            }}
            shiftA={null}
            allShifts={shifts}
         />
      </DashboardContent>
   );
}
