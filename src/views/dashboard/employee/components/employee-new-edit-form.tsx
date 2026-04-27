import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import useRoleStore from 'src/stores/role';
import useAuthStore from 'src/stores/auth';
import useUserStore from 'src/stores/user';
import useOfficeStore from 'src/stores/office';
import useCompanyStore from 'src/stores/company';
import useEmployeeStore from 'src/stores/employee';

type Props = {
   currentEmployee?: any;
};

export function EmployeeNewEditForm({ currentEmployee }: Props) {
   const router = useRouter();
   const { user: currentUserData } = useAuthStore();
 
   const isManager = currentUserData?.role?.name === 'Company Owner' || currentUserData?.role?.name === 'Office Manager';

   const { create, update } = useEmployeeStore();
   const { getAll: getOffices } = useOfficeStore();
   const { getAll: getCompanies } = useCompanyStore();
   const { all: getUsers, add: addUser } = useUserStore();
   const { roles, all: getRoles } = useRoleStore();

   const [offices, setOffices] = useState<any[]>([]);
   const [companies, setCompanies] = useState<any[]>([]);
   const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
       getOffices({ limit: 100 }).then(setOffices);
       getCompanies().then((res) => setCompanies(res.data || []));
       getUsers({ limit: 100, sort: 'created_at', order: 'desc' }).then((res) => setUsers(res.data?.data || []));
       getRoles();
    }, []);

    const NewEmployeeSchema = zod.object({
       // User Account Fields (Required only for new employees)
       name: zod.string().optional(),
       username: zod.string().optional(),
       email: zod.string().optional(),
       password: zod.string().optional(),
 
       // Employee Fields
       user_id: zod.string().optional(),
       nik: zod.string().min(1, 'NIK is required'),
       nip: zod.string().nullish(),
       npwp: zod.string().nullish(),
       address: zod.string().min(1, 'Address is required'),
       office_id: zod.string().min(1, 'Office is required'),
       company_id: zod.string().nullish(),
    }).refine((data) => {
       if (!currentEmployee && (!data.name || !data.username || !data.email || !data.password)) return false;
       return true;
    }, {
       message: 'User account details are required for new employees',
       path: ['name'],
    });

   const defaultValues = useMemo(
       () => ({
          name: '',
          username: '',
          email: '',
          password: '',
          user_id: currentEmployee?.user_id || '',
          nik: currentEmployee?.nik || '',
          nip: currentEmployee?.nip || '',
          npwp: currentEmployee?.npwp || '',
          address: currentEmployee?.address || '',
          office_id: currentEmployee?.office_id || '',
          company_id: currentEmployee?.company_id || (isManager ? currentUserData?.company_id : ''),
       }),
      [currentEmployee, isManager, currentUserData?.company_id]
   );

   const methods = useForm({
      resolver: zodResolver(NewEmployeeSchema) as any,
      defaultValues,
   });

   const {
      reset,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      if (currentEmployee) {
         reset(defaultValues);
      } else if (isManager && currentUserData?.company_id) {
         reset({
            ...defaultValues,
            company_id: currentUserData.company_id,
         });
      }
   }, [currentEmployee, defaultValues, reset, isManager, currentUserData?.company_id]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         let finalUserId = currentEmployee?.user_id || '';
 
         if (!currentEmployee) {
            // 1. Find 'Karyawan' role
            const karyawanRole = roles.find((r) => r.name === 'Karyawan');
            if (!karyawanRole) {
               throw new Error('Role "Karyawan" not found. Please contact admin.');
            }
 
            // 2. Create User
            const userRes = await addUser({
               name: data.name,
               username: data.username,
               email: data.email,
               password: data.password as string,
               role_id: karyawanRole.id,
               company_id: data.company_id || null,
               office_id: data.office_id || null,
            });
            
            if (!userRes.success) {
               throw new Error(userRes.message || 'Failed to create user account');
            }
            finalUserId = userRes.data.id;
         }
 
         const payload = {
            ...data,
            user_id: finalUserId,
            office_id: data.office_id || null,
            company_id: data.company_id || null,
            nip: data.nip || null,
            npwp: data.npwp || null,
         };
 
         if (currentEmployee) {
            await update(currentEmployee.id, payload);
            toast.success('Employee updated successfully!');
         } else {
            await create(payload);
            toast.success('Employee created successfully!');
         }

         router.push(paths.dashboard.employee.root);
      } catch (error: any) {
         toast.error(error?.response?.data?.message || 'Something went wrong');
      }
   });

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
               <Card sx={{ p: 3 }}>
                  <Box
                     rowGap={3}
                     columnGap={2}
                     display="grid"
                     gridTemplateColumns={{
                        xs: 'repeat(1, 1fr)',
                        sm: 'repeat(2, 1fr)',
                     }}
                  >
                     {!currentEmployee && (
                        <>
                           <Field.Text name="name" label="Full Name" />
                           <Field.Text name="username" label="Username" />
                           <Field.Text name="email" label="Email Address" />
                           <Field.Text name="password" label="Password" type="password" />
                        </>
                     )}

                     <Field.Text name="nik" label="NIK" />
                     <Field.Text name="nip" label="NIP (Optional)" />
                     <Field.Text name="npwp" label="NPWP (Optional)" />

                     {!isManager && (
                        <Field.Select name="company_id" label="Company (Optional)">
                           <MenuItem value="">None</MenuItem>
                           {companies.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                 {c.name}
                              </MenuItem>
                           ))}
                        </Field.Select>
                     )}

                     <Field.Select name="office_id" label="Office">
                        <MenuItem value="">None</MenuItem>
                        {offices.map((o) => (
                           <MenuItem key={o.id} value={o.id}>
                              {o.name}
                           </MenuItem>
                        ))}
                     </Field.Select>
                  </Box>

                  <Stack spacing={3} sx={{ mt: 3 }}>
                     <Field.Text name="address" label="Address" multiline rows={3} />
                  </Stack>

                  <Stack alignItems="flex-end" sx={{ mt: 3 }}>
                     <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                        {!currentEmployee ? 'Create Employee' : 'Save Changes'}
                     </LoadingButton>
                  </Stack>
               </Card>
            </Grid>
         </Grid>
      </Form>
   );
}
