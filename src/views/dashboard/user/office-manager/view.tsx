'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Modal from '@mui/material/Modal';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { toast } from 'src/components/snackbar';

import useUserStore from 'src/stores/user';
import useRoleStore from 'src/stores/role';
import useAuthStore from 'src/stores/auth';
import useEmployeeStore from 'src/stores/employee';

const modalStyle = {
   position: 'absolute' as 'absolute',
   top: '50%',
   left: '50%',
   transform: 'translate(-50%, -50%)',
   width: 400,
   bgcolor: 'background.paper',
   boxShadow: 24,
   p: 4,
   borderRadius: 2,
};

export function OfficeManagerView() {
   const { all: getUsers, assign: assignRole } = useUserStore();
   const { roles, all: getRoles } = useRoleStore();
   const { user } = useAuthStore();
   const { getAll: getEmployees } = useEmployeeStore();

   const [managers, setManagers] = useState<any[]>([]);
   const [employees, setEmployees] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [open, setOpen] = useState(false);
   const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
   const [submitting, setSubmitting] = useState(false);

   const fetchManagers = useCallback(async () => {
      setLoading(true);
      try {
         const res = await getUsers({ role: 'Office Manager', limit: 100 });
         setManagers(res.data?.data || []);
      } finally {
         setLoading(false);
      }
   }, [getUsers]);

   const fetchEmployees = useCallback(async () => {
      // Fetch all employees in the same company using Profile/Employee store
      try {
         const res = await getEmployees({ limit: 1000 });
         setEmployees(res.data?.data || []);
      } catch (err) {
         console.error(err);
      }
   }, [getEmployees]);

   useEffect(() => {
      fetchManagers();
      getRoles();
   }, [fetchManagers, getRoles]);

   const handleOpen = () => {
      fetchEmployees();
      setOpen(true);
   };

   const handleClose = () => {
      setOpen(false);
      setSelectedEmployees([]);
   };

   const handleAddManager = async () => {
      if (selectedEmployees.length === 0) {
         toast.error('Pilih setidaknya satu karyawan');
         return;
      }

      const managerRole = roles.find((r) => r.name === 'Office Manager');
      if (!managerRole?.id) {
         toast.error('Role "Office Manager" tidak ditemukan');
         return;
      }

      setSubmitting(true);
      try {
         for (const emp of selectedEmployees) {
            // emp here is Profile, so we use emp.user_id
            await assignRole({ id: emp.user_id, role_id: managerRole.id });
         }
         toast.success('Berhasil menambahkan manager');
         handleClose();
         fetchManagers();
      } catch (err) {
         toast.error('Gagal menambahkan manager');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Office Managers"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Administration' },
               { name: 'Managers' },
            ]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={handleOpen}
               >
                  Add Manager
               </Button>
            }
            sx={{ mb: 3 }}
         />

         <Card>
            <TableContainer>
               <Scrollbar>
                  <Table sx={{ minWidth: 720 }}>
                     <TableHead>
                        <TableRow>
                           <TableCell>#</TableCell>
                           <TableCell>User</TableCell>
                           <TableCell>Email</TableCell>
                           <TableCell>Office</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {loading ? (
                           <TableRow>
                              <TableCell colSpan={4} align="center">
                                 <CircularProgress />
                              </TableCell>
                           </TableRow>
                        ) : managers.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={4} align="center">
                                 No managers found
                              </TableCell>
                           </TableRow>
                        ) : (
                           managers.map((manager, index) => (
                              <TableRow key={manager.id} hover>
                                 <TableCell>{index + 1}</TableCell>
                                 <TableCell>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                       <Avatar alt={manager.name} src={manager.image} />
                                       <Typography variant="subtitle2">{manager.name || manager.username}</Typography>
                                    </Stack>
                                 </TableCell>
                                 <TableCell>{manager.email}</TableCell>
                                 <TableCell>{manager.office?.name || '-'}</TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </Scrollbar>
            </TableContainer>
         </Card>

         <Modal open={open} onClose={handleClose}>
            <Box sx={modalStyle}>
               <Typography variant="h6" sx={{ mb: 3 }}>Jadikan Manager</Typography>
               <Stack spacing={3}>
                  <Autocomplete
                     multiple
                     options={employees}
                     getOptionLabel={(option) => option.user?.name || option.user?.username || option.id}
                     value={selectedEmployees}
                     onChange={(_, newValue) => setSelectedEmployees(newValue)}
                     renderInput={(params) => <TextField {...params} label="Pilih Karyawan" />}
                     renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                           <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar alt={option.user?.name} src={option.user?.image} sx={{ width: 24, height: 24 }} />
                              <Stack>
                                 <Typography variant="body2">{option.user?.name || option.user?.username}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {option.office?.name || 'No Office'} • {option.nik}
                                 </Typography>
                              </Stack>
                           </Stack>
                        </li>
                     )}
                  />
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                     <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
                     <Button 
                        variant="contained" 
                        onClick={handleAddManager} 
                        disabled={submitting || selectedEmployees.length === 0}
                     >
                        {submitting ? <CircularProgress size={24} /> : 'Konfirmasi'}
                     </Button>
                  </Stack>
               </Stack>
            </Box>
         </Modal>
      </DashboardContent>
   );
}
