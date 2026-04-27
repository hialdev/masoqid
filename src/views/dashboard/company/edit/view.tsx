'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useCompanyStore from 'src/stores/company';
import useUserStore from 'src/stores/user';
import { CONFIG } from 'src/global-config';

import { CompanyUserModal } from '../components/company-user-modal';

// ----------------------------------------------------------------------

type Props = {
   id: string;
};

export function CompanyEditView({ id }: Props) {
   const router = useRouter();
   const { getById, update } = useCompanyStore();
   const { all: getUsers } = useUserStore();

   const [loading, setLoading] = useState(false);
   const [fetching, setFetching] = useState(true);
   const [logoPreview, setLogoPreview] = useState<string | null>(null);
   const [logoFile, setLogoFile] = useState<File | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [users, setUsers] = useState<any[]>([]);
   const [openUserModal, setOpenUserModal] = useState(false);

   const [form, setForm] = useState({
      name: '',
      address: '',
      phone: '',
      pic_name: '',
      email: '',
      owner_id: '',
   });

   const fetchUsers = useCallback(async () => {
      const res = await getUsers({ limit: 100, sort: 'created_at', order: 'desc', role: 'Company Owner' });
      const data = res.data?.data || [];
      setUsers(data);
      return data;
   }, [getUsers]);

   useEffect(() => {
      fetchUsers();
   }, [fetchUsers]);

   const [errors, setErrors] = useState<Record<string, string>>({});

   // Fetch existing data
   useEffect(() => {
      const fetchData = async () => {
         try {
            const company = await getById(id);

            // Try to find current owner
            const allUsers = await fetchUsers();
            const currentOwner = allUsers.find((u: any) => u.company_id === id);

            setForm({
               name: company.name || '',
               address: company.address || '',
               phone: company.phone || '',
               pic_name: company.pic_name || '',
               email: company.email || '',
               owner_id: currentOwner?.id || '',
            });
            if (company.logo) {
               const logoUrl = company.logo.startsWith('http')
                  ? company.logo
                  : `${CONFIG.apiHostUrl}/${company.logo}`;
               setLogoPreview(logoUrl);
            }
         } catch {
            toast.error('Gagal memuat data company');
            router.push(paths.dashboard.company.root);
         } finally {
            setFetching(false);
         }
      };
      fetchData();
   }, [id, getById, router, getUsers]);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
   };

   const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
         toast.error('Ukuran file logo maksimal 10MB');
         return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
   };

   const validate = () => {
      const newErrors: Record<string, string> = {};
      if (!form.name.trim()) newErrors.name = 'Nama wajib diisi';
      if (!form.address.trim()) newErrors.address = 'Alamat wajib diisi';
      if (!form.phone.trim()) newErrors.phone = 'Telepon wajib diisi';
      if (!form.pic_name.trim()) newErrors.pic_name = 'Nama PIC wajib diisi';
      if (!form.email.trim()) newErrors.email = 'Email wajib diisi';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Format email tidak valid';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setLoading(true);
      try {
         const formData = new FormData();
         formData.append('name', form.name);
         formData.append('address', form.address);
         formData.append('phone', form.phone);
         formData.append('pic_name', form.pic_name);
         formData.append('email', form.email);
         if (form.owner_id) formData.append('owner_id', form.owner_id);
         if (logoFile) formData.append('logo', logoFile);

         const res = await update(id, formData);
         if (res?.success) {
            toast.success('Company berhasil diperbarui');
            router.push(paths.dashboard.company.root);
         } else {
            toast.error(res?.message || 'Gagal memperbarui company');
         }
      } catch (err: any) {
         toast.error(err?.message || 'Terjadi kesalahan');
      } finally {
         setLoading(false);
      }
   };

   if (fetching) {
      return (
         <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" height={180} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" height={300} />
         </Box>
      );
   }

   return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
         {/* Header */}
         <Stack direction="row" alignItems="center" gap={1} mb={3}>
            <IconButton onClick={() => router.back()} size="small">
               <Iconify icon="solar:arrow-left-bold" />
            </IconButton>
            <Box>
               <Typography variant="h5" fontWeight={700}>Edit Company</Typography>
               <Typography variant="body2" color="text.secondary">
                  Perbarui data perusahaan
               </Typography>
            </Box>
         </Stack>

         <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
               {/* Logo Upload */}
               <Grid size={{xs:12}}>
                  <Card sx={{ p: 3 }}>
                     <Typography variant="subtitle2" mb={2} fontWeight={600}>Logo Perusahaan</Typography>
                     <Stack direction="row" alignItems="center" gap={3}>
                        <Avatar
                           src={logoPreview || undefined}
                           variant="rounded"
                           sx={{ width: 100, height: 100, bgcolor: 'background.neutral', cursor: 'pointer' }}
                           onClick={() => fileInputRef.current?.click()}
                        >
                           <Iconify icon="solar:camera-add-bold-duotone" width={36} />
                        </Avatar>
                        <Box>
                           <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Iconify icon="solar:upload-minimalistic-bold" />}
                              onClick={() => fileInputRef.current?.click()}
                           >
                              {logoPreview ? 'Ganti Logo' : 'Upload Logo'}
                           </Button>
                           <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                              PNG, JPG, WEBP. Maks. 10MB
                           </Typography>
                           {logoFile && (
                              <Typography variant="caption" color="success.main" display="block">
                                 ✓ Logo baru dipilih: {logoFile.name}
                              </Typography>
                           )}
                        </Box>
                        <input
                           ref={fileInputRef}
                           type="file"
                           accept="image/*"
                           hidden
                           onChange={handleLogoChange}
                        />
                     </Stack>
                  </Card>
               </Grid>

               {/* Form Fields */}
               <Grid size={{xs:12}}>
                  <Card sx={{ p: 3 }}>
                     <Typography variant="subtitle2" mb={2} fontWeight={600}>Informasi Perusahaan</Typography>
                     <Grid container spacing={2}>
                        <Grid size={{xs:12}}>
                           <TextField
                              fullWidth
                              label="Nama Perusahaan"
                              name="name"
                              value={form.name}
                              onChange={handleChange}
                              error={!!errors.name}
                              helperText={errors.name}
                              required
                           />
                        </Grid>
                        <Grid size={{xs:12}}>
                           <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Alamat"
                              name="address"
                              value={form.address}
                              onChange={handleChange}
                              error={!!errors.address}
                              helperText={errors.address}
                              required
                           />
                        </Grid>
                        <Grid size={{xs:12, sm:6}}>
                           <TextField
                              fullWidth
                              label="Nomor Telepon"
                              name="phone"
                              value={form.phone}
                              onChange={handleChange}
                              error={!!errors.phone}
                              helperText={errors.phone}
                              required
                           />
                        </Grid>
                        <Grid size={{xs:12, sm:6}}>
                           <TextField
                              fullWidth
                              label="Email"
                              name="email"
                              type="email"
                              value={form.email}
                              onChange={handleChange}
                              error={!!errors.email}
                              helperText={errors.email}
                              required
                           />
                        </Grid>
                        <Grid size={{xs:12}}>
                           <TextField
                              fullWidth
                              label="Nama PIC (Person in Charge)"
                              name="pic_name"
                              value={form.pic_name}
                              onChange={handleChange}
                              error={!!errors.pic_name}
                              helperText={errors.pic_name}
                              required
                           />
                        </Grid>
                        <Grid size={{xs:12}}>
                           <Typography variant="subtitle2" mb={1} fontWeight={600}>Assign Company Owner</Typography>
                           <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Autocomplete
                                 fullWidth
                                 options={users}
                                 getOptionLabel={(option) => option.name || option.email || ''}
                                 value={users.find(u => u.id === form.owner_id) || null}
                                 onChange={(e, newValue) => {
                                    setForm({ ...form, owner_id: newValue?.id || '' });
                                 }}
                                 renderInput={(params) => (
                                    <TextField 
                                       {...params} 
                                       label="Select User as Owner" 
                                       placeholder="Pilih user atau buat baru"
                                    />
                                 )}
                              />
                              <Button
                                 variant="soft"
                                 color="primary"
                                 sx={{ height: 56, minWidth: 140 }}
                                 startIcon={<Iconify icon="solar:user-plus-bold" />}
                                 onClick={() => setOpenUserModal(true)}
                              >
                                 + Company User
                              </Button>
                           </Stack>
                           <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              User yang dipilih akan secara otomatis terkait dengan company ini.
                           </Typography>
                        </Grid>
                     </Grid>
                  </Card>
               </Grid>

               {/* Actions */}
               <Grid size={{xs:12}}>
                  <Stack direction="row" justifyContent="flex-end" gap={2}>
                     <Button
                        variant="outlined"
                        onClick={() => router.back()}
                        disabled={loading}
                     >
                        Batal
                     </Button>
                     <LoadingButton
                        type="submit"
                        variant="contained"
                        loading={loading}
                        startIcon={<Iconify icon="solar:diskette-bold" />}
                     >
                        Simpan Perubahan
                     </LoadingButton>
                  </Stack>
               </Grid>
            </Grid>
         </form>

         <CompanyUserModal
            open={openUserModal}
            onClose={() => setOpenUserModal(false)}
            onSuccess={(newUser) => {
               fetchUsers();
               setForm((prev) => ({ ...prev, owner_id: newUser.id }));
            }}
         />
      </Box>
   );
}
