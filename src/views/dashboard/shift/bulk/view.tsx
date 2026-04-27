'use client';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import useShiftStore from 'src/stores/shift';
import useOfficeStore from 'src/stores/office';
import { OfficeSelector } from '../components/office-selector';

export function BulkShiftView() {
    const { bulkCreateShifts } = useShiftStore();
    const { offices, getAll: getOffices, getOfficeUsers } = useOfficeStore();
 
    const [users, setUsers] = useState<any[]>([]);
    const [selectedOffice, setSelectedOffice] = useState<any>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
 
    const NewBulkShiftSchema = zod.object({
       shifts: zod.array(zod.object({
          user_ids: zod.array(zod.string()).min(1, 'At least one employee required'),
          date: zod.string().min(1, 'Date is required'),
          start_time: zod.string().min(1, 'Start time is required'),
          end_time: zod.string().min(1, 'End time is required'),
       })).min(1, 'At least one shift row is required'),
    });
 
    const defaultValues = useMemo(() => ({
       shifts: [{ user_ids: [], date: '', start_time: '08:00', end_time: '17:00' }],
    }), []);
 
    const methods = useForm({
       resolver: zodResolver(NewBulkShiftSchema) as any,
       defaultValues,
    });
 
    const {
       control,
       handleSubmit,
       reset,
       watch,
       setValue,
       formState: { isSubmitting },
    } = methods;
 
    const { fields, append, remove } = useFieldArray({
       control,
       name: 'shifts',
    });
 
    useEffect(() => {
       getOffices({ limit: 100 });
    }, [getOffices]);
 
    useEffect(() => {
       if (selectedOffice?.id) {
          setLoadingUsers(true);
          getOfficeUsers(selectedOffice.id)
             .then((res) => {
                setUsers(res || []);
             })
             .finally(() => setLoadingUsers(false));
       } else {
          setUsers([]);
       }
    }, [selectedOffice, getOfficeUsers]);
 
    const onSubmit = handleSubmit(async (data) => {
       try {
          if (!selectedOffice) {
             toast.error('Please select an office first');
             return;
          }
 
          const payload: any[] = [];
          
          for (let s of data.shifts) {
             const formattedDate = dayjs(s.date).format('YYYY-MM-DD');
             const formattedStartTime = dayjs(s.start_time).format('HH:mm');
             const formattedEndTime = dayjs(s.end_time).format('HH:mm');
 
             s.user_ids.forEach((userId: string) => {
                payload.push({
                   user_id: userId,
                   date: formattedDate,
                   start_time: formattedStartTime,
                   end_time: formattedEndTime,
                   office_id: selectedOffice.id,
                });
             });
          }
 
          if (payload.length === 0) {
             toast.error('No users selected');
             return;
          }
 
          await bulkCreateShifts(payload);
          toast.success(`Successfully created ${payload.length} shifts!`);
          reset(defaultValues);
       } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to create bulk shifts');
       }
    });

    return (
       <DashboardContent>
          <CustomBreadcrumbs
             heading="Bulk Shift Management"
             links={[
                { name: 'Dashboard', href: paths.dashboard.root },
                { name: 'Shift', href: paths.dashboard.shift.root },
                { name: 'Bulk Create' },
             ]}
             sx={{ mb: { xs: 3, md: 5 } }}
          />
 
          <Card sx={{ p: 3, mb: 3 }}>
             <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Pilih Office
             </Typography>
             <OfficeSelector
                offices={offices}
                selected={selectedOffice}
                onSelect={(office) => {
                   setSelectedOffice(office);
                }}
             />
          </Card>
 
          <Form methods={methods} onSubmit={onSubmit}>
             <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>Step 2: Add Shifts</Typography>
 
                <Stack spacing={3}>
                   {fields.map((item, index) => (
                      <Grid container spacing={2} key={item.id} alignItems="flex-start">
                         <Grid size={{ xs: 12, md: 4 }}>
                            <Field.Autocomplete
                               name={`shifts.${index}.user_ids`}
                               multiple
                               label="Select Employees"
                               placeholder="Search..."
                               size="small"
                               loading={loadingUsers}
                               options={users.map((u) => u.id)}
                               getOptionLabel={(option) => {
                                  const user = users.find((u) => u.id === option);
                                  return user?.name + " (" + user?.username + ")" || option;
                               }}
                               disableCloseOnSelect
                            />
                         </Grid>
                         <Grid size={{ xs: 12, md: 2 }}>
                            <Field.DatePicker
                               name={`shifts.${index}.date`}
                               label="Date"
                               slotProps={{ textField: { size: 'small' } }}
                            />
                         </Grid>
                         <Grid size={{ xs: 12, md: 2 }}>
                            <Field.TimePicker
                               name={`shifts.${index}.start_time`}
                               label="Start Time"
                               slotProps={{ textField: { size: 'small' } }}
                            />
                         </Grid>
                         <Grid size={{ xs: 12, md: 2 }}>
                            <Field.TimePicker
                               name={`shifts.${index}.end_time`}
                               label="End Time"
                               slotProps={{ textField: { size: 'small' } }}
                            />
                         </Grid>
                         <Grid size={{ xs: 12, md: 2 }}>
                            <IconButton color="error" onClick={() => remove(index)} sx={{ mt: 0.5 }}>
                               <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                         </Grid>
                      </Grid>
                   ))}
                </Stack>
 
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                   <Button
                      variant="outlined"
                      startIcon={<Iconify icon="mingcute:add-line" />}
                      onClick={() => append({ user_ids: [], date: '', start_time: '08:00', end_time: '17:00' })}
                      disabled={!selectedOffice}
                   >
                      Add Shift Row
                   </Button>
                   <LoadingButton 
                      type="submit"
                      variant="contained" 
                      loading={isSubmitting}
                      disabled={!selectedOffice || fields.length === 0}
                   >
                      Submit All Shifts
                   </LoadingButton>
                </Box>
             </Card>
          </Form>
       </DashboardContent>
    );
}
