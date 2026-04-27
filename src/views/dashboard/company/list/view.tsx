'use client';

import type { CompanyData } from 'src/stores/company';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useCompanyStore from 'src/stores/company';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export function CompanyListView() {
   const router = useRouter();
   const { companies, loading, getAll, delete: deleteCompany } = useCompanyStore();

   const [search, setSearch] = useState('');
   const [page, setPage] = useState(0);
   const [rowsPerPage, setRowsPerPage] = useState(10);
   const [total, setTotal] = useState(0);
   const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
      open: false, id: '', name: '',
   });
   const [deleting, setDeleting] = useState(false);

   const fetchData = useCallback(async () => {
      const res = await getAll({ page: page + 1, limit: rowsPerPage, search });
      if (res?.total) setTotal(res.total);
   }, [getAll, page, rowsPerPage, search]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(0);
   };

   const handleDeleteOpen = (id: string, name: string) => {
      setDeleteDialog({ open: true, id, name });
   };

   const handleDeleteClose = () => {
      setDeleteDialog({ open: false, id: '', name: '' });
   };

   const handleDeleteConfirm = async () => {
      setDeleting(true);
      try {
         await deleteCompany(deleteDialog.id);
         toast.success('Company berhasil dihapus');
         handleDeleteClose();
      } catch {
         toast.error('Gagal menghapus company');
      } finally {
         setDeleting(false);
      }
   };

   const getLogoUrl = (logo?: string | null) => {
      if (!logo) return undefined;
      if (logo.startsWith('http')) return logo;
      return `${CONFIG.apiHostUrl}/${logo}`;
   };

   return (
      <Box sx={{ p: 3 }}>
         {/* Header */}
         <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
            <Box>
               <Typography variant="h4" fontWeight={700}>Company</Typography>
               <Typography variant="body2" color="text.secondary">
                  Kelola data perusahaan — hanya Super Admin
               </Typography>
            </Box>
            <Button
               variant="contained"
               startIcon={<Iconify icon="solar:add-circle-bold" />}
               onClick={() => router.push(paths.dashboard.company.create)}
            >
               Tambah Company
            </Button>
         </Stack>

         <Card>
            {/* Search */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
               <TextField
                  size="small"
                  placeholder="Cari nama, email, atau telepon..."
                  value={search}
                  onChange={handleSearchChange}
                  sx={{ width: 320 }}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="solar:magnifer-bold" width={18} />
                        </InputAdornment>
                     ),
                  }}
               />
            </Box>

            <TableContainer>
               <Table>
                  <TableHead>
                     <TableRow>
                        <TableCell>Logo</TableCell>
                        <TableCell>Nama</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Telepon</TableCell>
                        <TableCell>PIC</TableCell>
                        <TableCell align="right">Aksi</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {loading ? (
                        <TableRow>
                           <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                              <CircularProgress size={32} />
                           </TableCell>
                        </TableRow>
                     ) : companies.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                              <Typography color="text.secondary">Tidak ada data company</Typography>
                           </TableCell>
                        </TableRow>
                     ) : (
                        companies.map((company: CompanyData) => (
                           <TableRow key={company.id} hover>
                              <TableCell>
                                 <Avatar
                                    src={getLogoUrl(company.logo)}
                                    alt={company.name}
                                    variant="rounded"
                                    sx={{ width: 48, height: 48, bgcolor: 'primary.lighter' }}
                                 >
                                    <Iconify icon="solar:buildings-bold-duotone" />
                                 </Avatar>
                              </TableCell>
                              <TableCell>
                                 <Typography fontWeight={600}>{company.name}</Typography>
                                 <Typography variant="caption" color="text.secondary" noWrap>
                                    {company.address}
                                 </Typography>
                              </TableCell>
                              <TableCell>{company.email}</TableCell>
                              <TableCell>{company.phone}</TableCell>
                              <TableCell>{company.pic_name}</TableCell>
                              <TableCell align="right">
                                 <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                                    <IconButton
                                       size="small"
                                       color="info"
                                       onClick={() => router.push(paths.dashboard.company.edit(company.id))}
                                       title="Edit"
                                    >
                                       <Iconify icon="solar:pen-bold" width={18} />
                                    </IconButton>
                                    <IconButton
                                       size="small"
                                       color="error"
                                       onClick={() => handleDeleteOpen(company.id, company.name)}
                                       title="Hapus"
                                    >
                                       <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                    </IconButton>
                                 </Stack>
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </TableContainer>

            <TablePagination
               component="div"
               count={total}
               page={page}
               onPageChange={(_, newPage) => setPage(newPage)}
               rowsPerPage={rowsPerPage}
               onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
               }}
               rowsPerPageOptions={[5, 10, 25]}
            />
         </Card>

         {/* Delete Confirmation Dialog */}
         <Dialog open={deleteDialog.open} onClose={handleDeleteClose} maxWidth="xs" fullWidth>
            <DialogTitle>Hapus Company</DialogTitle>
            <DialogContent>
               <DialogContentText>
                  Apakah Anda yakin ingin menghapus company{' '}
                  <strong>{deleteDialog.name}</strong>? Tindakan ini tidak dapat dibatalkan.
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button onClick={handleDeleteClose} disabled={deleting}>
                  Batal
               </Button>
               <Button
                  onClick={handleDeleteConfirm}
                  color="error"
                  variant="contained"
                  disabled={deleting}
                  startIcon={deleting ? <CircularProgress size={16} /> : <Iconify icon="solar:trash-bin-trash-bold" />}
               >
                  {deleting ? 'Menghapus...' : 'Hapus'}
               </Button>
            </DialogActions>
         </Dialog>
      </Box>
   );
}
