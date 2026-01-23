import { useState, useEffect } from 'react';
import {
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Button,
   Stack,
   FormControl,
   InputLabel,
   Select,
   MenuItem,
   TextField,
   Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Iconify } from 'src/components/iconify';
import { toast } from 'sonner';
import { CONFIG } from 'src/global-config';
import { fDate } from 'src/utils/format-time';
import dayjs from 'dayjs';

import useOfficeStore from 'src/stores/office';

type ExportAttendanceDialogProps = {
   open: boolean;
   onClose: () => void;
   officeOptions: Array<{ id: string; name: string }>;
   userOptions: Array<{ id: string; name: string }>; // Contains all users initially
};

export function ExportAttendanceDialog({
   open,
   onClose,
   officeOptions,
   userOptions: allUsers,
}: ExportAttendanceDialogProps) {
   const { getOfficeUsers } = useOfficeStore();

   const [format, setFormat] = useState('xlsx');
   const [startDate, setStartDate] = useState<Date | null>(dayjs().startOf('month').toDate());
   const [endDate, setEndDate] = useState<Date | null>(dayjs().endOf('month').toDate());

   // State for selections
   const [selectedOffice, setSelectedOffice] = useState<{ id: string; name: string } | null>(null);
   const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

   // State for filtering
   const [filteredUserOptions, setFilteredUserOptions] = useState(allUsers);
   const [isLoadingUsers, setIsLoadingUsers] = useState(false);
   const [downloading, setDownloading] = useState(false);

   // Reset users when dialog opens
   useEffect(() => {
      if (open) {
         setFilteredUserOptions(allUsers);
         setSelectedOffice(null);
         setSelectedUser(null);
      }
   }, [open, allUsers]);

   // Handle Office Change
   const handleOfficeChange = async (_: any, newValue: { id: string; name: string } | null) => {
      setSelectedOffice(newValue);
      setSelectedUser(null); // Reset user when office changes

      if (newValue) {
         setIsLoadingUsers(true);
         try {
            const users = await getOfficeUsers(newValue.id);
            if (users && Array.isArray(users)) {
               setFilteredUserOptions(
                  users.map((u: any) => ({
                     id: u.id,
                     name: u.name || u.username,
                  }))
               );
            } else {
               setFilteredUserOptions([]);
            }
         } catch (error) {
            console.error('Failed to fetch office users:', error);
            toast.error('Gagal mengambil data karyawan kantor ini');
            setFilteredUserOptions([]);
         } finally {
            setIsLoadingUsers(false);
         }
      } else {
         // If office cleared, show all users
         setFilteredUserOptions(allUsers);
      }
   };

   const handleExport = async () => {
      if (!startDate || !endDate) {
         toast.error('Tanggal mulai dan selesai wajib diisi');
         return;
      }

      setDownloading(true);

      try {
         const params = new URLSearchParams({
            format,
            start_date: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
            end_date: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
         });

         if (selectedOffice) params.append('office_id', selectedOffice.id);
         if (selectedUser) params.append('user_id', selectedUser.id);

         const response = await fetch(
            `${CONFIG.apiHostUrl}/api/attendance/export?${params.toString()}`,
            {
               method: 'GET',
               headers: {
                  'Content-Type': 'application/json',
               },
               credentials: 'include',
            }
         );

         const contentType = response.headers.get('content-type');
         if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            if (!json.success) {
               throw new Error(json.message || 'Gagal export data');
            }
         }

         if (!response.ok) {
            throw new Error('Gagal export data');
         }

         // Should be blob
         const blob = await response.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `attendance-export-${fDate(new Date())}.${format}`;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(url);
         document.body.removeChild(a);

         toast.success('Export berhasil!');
         onClose();
      } catch (error) {
         console.error('Export error:', error);
         toast.error('Gagal mengexport data');
      } finally {
         setDownloading(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Export Data Absensi</DialogTitle>

         <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
               <FormControl fullWidth>
                  <InputLabel>Format File</InputLabel>
                  <Select
                     value={format}
                     label="Format File"
                     onChange={(e) => setFormat(e.target.value)}
                  >
                     <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                     <MenuItem value="csv">CSV (.csv)</MenuItem>
                  </Select>
               </FormControl>

               <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DatePicker
                     label="Tanggal Mulai"
                     value={dayjs(startDate)}
                     onChange={(newValue) => setStartDate(newValue?.toDate() || null)}
                     slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                     label="Tanggal Selesai"
                     value={dayjs(endDate)}
                     onChange={(newValue) => setEndDate(newValue?.toDate() || null)}
                     slotProps={{ textField: { fullWidth: true } }}
                  />
               </Stack>

               <Autocomplete
                  options={officeOptions}
                  getOptionLabel={(option) => option.name}
                  value={selectedOffice}
                  onChange={handleOfficeChange}
                  renderInput={(params) => (
                     <TextField {...params} label="Lokasi Kantor (Opsional)" fullWidth />
                  )}
                  noOptionsText="Tidak ada kantor ditemukan"
               />

               <Autocomplete
                  options={filteredUserOptions}
                  getOptionLabel={(option) => option.name}
                  value={selectedUser}
                  onChange={(_, newValue) => setSelectedUser(newValue)}
                  loading={isLoadingUsers}
                  renderInput={(params) => (
                     <TextField
                        {...params}
                        label="Karyawan (Opsional)"
                        fullWidth
                        placeholder={
                           selectedOffice
                              ? `Cari karyawan di ${selectedOffice.name}...`
                              : 'Cari semua karyawan...'
                        }
                     />
                  )}
                  noOptionsText="Tidak ada karyawan ditemukan"
               />
            </Stack>
         </DialogContent>

         <DialogActions>
            <Button onClick={onClose} disabled={downloading}>
               Batal
            </Button>
            <Button
               variant="contained"
               onClick={handleExport}
               disabled={downloading}
               startIcon={
                  downloading ? (
                     <Iconify icon="line-md:loading-loop" />
                  ) : (
                     <Iconify icon="solar:export-bold" />
                  )
               }
            >
               {downloading ? 'Downloading...' : 'Export'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}
