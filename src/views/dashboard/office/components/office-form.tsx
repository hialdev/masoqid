'use client';

import type { OfficeData } from 'src/stores/office';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import useOfficeStore from 'src/stores/office';
import useCompanyStore from 'src/stores/company';
import useAuthStore from 'src/stores/auth';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export type OfficeSchemaType = zod.infer<typeof OfficeSchema>;

export const OfficeSchema = zod.object({
   name: zod.string().min(3, 'Name must be at least 3 characters').max(255),
   description: zod.string().optional(),
   address: zod.string().min(1, 'Address is required'),
   latitude: zod.coerce
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
   longitude: zod.coerce
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
   is_strict_radius: zod.boolean(),
   radius_for_checkin: zod.boolean(),
   radius_for_checkout: zod.boolean(),
   radius_allow: zod.coerce
      .number()
      .min(1, 'Radius must be at least 1 meter')
      .max(10000, 'Radius cannot exceed 10000 meters'),
   company_id: zod.string().nullable().optional(),
});

// ----------------------------------------------------------------------

type Props = {
   currentOffice?: OfficeData;
};

export function OfficeForm({ currentOffice }: Props) {
   const router = useRouter();
   const { create, update } = useOfficeStore();
   const { companies, getAll: getAllCompanies, loading: companiesLoading } = useCompanyStore();
   const { user } = useAuthStore();
   const [loading, setLoading] = useState(false);
 
   const isCompanyOwner = user?.role?.name === 'Company Owner';

   const defaultValues: OfficeSchemaType = {
      name: currentOffice?.name || '',
      description: currentOffice?.description || '',
      address: currentOffice?.address || '',
      latitude: currentOffice?.latitude || -6.2088,
      longitude: currentOffice?.longitude || 106.8456,
      is_strict_radius: currentOffice?.is_strict_radius || false,
      radius_for_checkin: currentOffice?.radius_for_checkin || false,
      radius_for_checkout: currentOffice?.radius_for_checkout || false,
      radius_allow: currentOffice?.radius_allow || 100,
      company_id: currentOffice?.company_id || (isCompanyOwner ? user?.company_id : null),
   };

   const methods = useForm<OfficeSchemaType>({
      resolver: zodResolver(OfficeSchema) as any,
      defaultValues,
   });

   const {
      reset,
      watch,
      setValue,
      handleSubmit,
      register,
      formState: { isSubmitting, errors },
   } = methods;
 
   useEffect(() => {
      if (isCompanyOwner && user?.company_id && !currentOffice) {
         reset({
            ...defaultValues,
            company_id: user.company_id,
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isCompanyOwner, user?.company_id, reset, currentOffice]);

   const values = watch();

   // Load companies for selector
   useEffect(() => {
      getAllCompanies({ limit: 100 });
   }, []);

   useEffect(() => {
      if (currentOffice) {
         reset(defaultValues);
      }
   }, [currentOffice]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         setLoading(true);

         // Transform: send null when empty string
         const payload = {
            ...data,
            company_id: data.company_id || null,
         };

         if (currentOffice) {
            const result = await update(currentOffice.id, payload);
            if (result.success) {
               toast.success(result.message || 'Office updated successfully');
               router.push(paths.dashboard.office.root);
            }
         } else {
            const result = await create(payload);
            if (result.success) {
               toast.success(result.message || 'Office created successfully');
               router.push(paths.dashboard.office.root);
            }
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Failed to save office');
      } finally {
         setLoading(false);
      }
   });

   const renderDetails = (
      <Card sx={{ p: 3 }}>
         <Typography variant="h6" sx={{ mb: 3 }}>
            Office Details
         </Typography>

         <Stack spacing={3}>
            <Field.Text name="name" label="Office Name" required />

            <Field.Text name="description" label="Description" multiline rows={3} />

            <Field.Text name="address" label="Address" required multiline rows={2} />
         </Stack>
      </Card>
   );

   const renderCompany = (
      <Card sx={{ p: 3 }}>
         <Typography variant="h6" sx={{ mb: 1 }}>
            Company
         </Typography>
         <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Hubungkan office ini ke company
         </Typography>

         <TextField
            select
            fullWidth
            label="Pilih Company"
            value={values.company_id || ''}
            onChange={(e) => setValue('company_id', e.target.value || null)}
            disabled={companiesLoading}
            InputProps={{
               startAdornment: companiesLoading ? (
                  <InputAdornment position="start">
                     <CircularProgress size={16} />
                  </InputAdornment>
               ) : (
                  <InputAdornment position="start">
                     <Iconify icon="solar:buildings-bold-duotone" width={18} />
                  </InputAdornment>
               ),
            }}
            helperText={
               currentOffice?.company
                  ? `Saat ini: ${currentOffice.company.name}`
                  : 'Opsional — kosongkan jika belum ada company'
            }
         >
            <MenuItem value="">
               <em>— Tidak ada company —</em>
            </MenuItem>
            {companies.map((c) => (
               <MenuItem key={c.id} value={c.id}>
                  {c.name}
               </MenuItem>
            ))}
         </TextField>
      </Card>
   );

   const renderLocation = (
      <Card sx={{ p: 3 }}>
         <Typography variant="h6" sx={{ mb: 3 }}>
            Location
         </Typography>

         <Stack spacing={3}>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text
                     name="latitude"
                     label="Latitude"
                     type="text"
                     required
                     placeholder="-6.2088"
                     helperText="Range: -90 to 90"
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text
                     name="longitude"
                     label="Longitude"
                     type="text"
                     required
                     placeholder="106.8456"
                     helperText="Range: -180 to 180"
                  />
               </Grid>
            </Grid>

            <Box
               sx={{
                  height: 300,
                  bgcolor: 'background.neutral',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
               }}
            >
               <Typography variant="body2" color="text.secondary">
                  Map Preview: {Number(values.latitude).toFixed(6)},{' '}
                  {Number(values.longitude).toFixed(6)}
               </Typography>
               {/* TODO: Integrate Google Maps or Leaflet here */}
            </Box>

            <Typography variant="caption" color="text.secondary">
               Click on the map to set the office location, or enter coordinates manually above.
            </Typography>
         </Stack>
      </Card>
   );

   const renderRadiusSettings = (
      <Card sx={{ p: 3 }}>
         <Typography variant="h6" sx={{ mb: 3 }}>
            Radius Validation Settings
         </Typography>

         <Stack spacing={3}>
            <Field.Switch
               name="is_strict_radius"
               label="Enable Strict Radius Validation"
               helperText="When enabled, employees must be within the specified radius to check-in/check-out"
            />

            {values.is_strict_radius && (
               <>
                  <Field.Switch
                     name="radius_for_checkin"
                     label="Validate Radius for Check-in"
                     helperText="Require employees to be within radius when checking in"
                  />

                  <Field.Switch
                     name="radius_for_checkout"
                     label="Validate Radius for Check-out"
                     helperText="Require employees to be within radius when checking out"
                  />

                  <Field.Text
                     name="radius_allow"
                     label="Allowed Radius (meters)"
                     type="number"
                     required
                     helperText="Maximum distance in meters from office location"
                     inputProps={{ min: 1, max: 10000 }}
                  />
               </>
            )}
         </Stack>
      </Card>
   );

   const renderActions = (
      <Stack direction="row" spacing={2} justifyContent="flex-end">
         <Button
            variant="outlined"
            color="inherit"
            onClick={() => router.push(paths.dashboard.office.root)}
         >
            Cancel
         </Button>

         <LoadingButton type="submit" variant="contained" loading={isSubmitting || loading}>
            {currentOffice ? 'Update Office' : 'Create Office'}
         </LoadingButton>
      </Stack>
   );

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading={currentOffice ? 'Edit Office' : 'Create Office'}
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Office', href: paths.dashboard.office.root },
               { name: currentOffice ? 'Edit' : 'Create' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={3}>
               {renderDetails}
               {!isCompanyOwner && renderCompany}
               {renderLocation}
               {renderRadiusSettings}
               {renderActions}
            </Stack>
         </Form>
      </DashboardContent>
   );
}
