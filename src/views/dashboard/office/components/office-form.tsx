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
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import useOfficeStore from 'src/stores/office';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
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
});

// ----------------------------------------------------------------------

type Props = {
   currentOffice?: OfficeData;
};

export function OfficeForm({ currentOffice }: Props) {
   const router = useRouter();
   const { create, update } = useOfficeStore();
   const [loading, setLoading] = useState(false);

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
   };

   const methods = useForm<OfficeSchemaType>({
      resolver: zodResolver(OfficeSchema),
      defaultValues,
   });

   const {
      reset,
      watch,
      setValue,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const values = watch();

   useEffect(() => {
      if (currentOffice) {
         reset(defaultValues);
      }
   }, [currentOffice]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         setLoading(true);

         if (currentOffice) {
            const result = await update(currentOffice.id, data);
            if (result.success) {
               toast.success(result.message || 'Office updated successfully');
               router.push(paths.dashboard.office.root);
            }
         } else {
            const result = await create(data);
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

   const renderLocation = (
      <Card sx={{ p: 3 }}>
         <Typography variant="h6" sx={{ mb: 3 }}>
            Location
         </Typography>

         <Stack spacing={3}>
            <Grid container spacing={2}>
               <Grid item xs={12} md={6}>
                  <Field.Text
                     name="latitude"
                     label="Latitude"
                     type="text"
                     required
                     placeholder="-6.2088"
                     helperText="Range: -90 to 90"
                  />
               </Grid>
               <Grid item xs={12} md={6}>
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
               {renderLocation}
               {renderRadiusSettings}
               {renderActions}
            </Stack>
         </Form>
      </DashboardContent>
   );
}
