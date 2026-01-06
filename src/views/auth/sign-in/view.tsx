"use client"

import type { TabProps } from '@mui/material/Tab';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import useAuthStore from 'src/stores/auth';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type SignInType = z.infer<typeof SignInSchema>;

export const SignInSchema = z.object({
   phoneNumber: schemaUtils.phoneNumber({ isValid: isValidPhoneNumber }).optional().or(z.literal('')),
   email: schemaUtils.email().optional().or(z.literal('')),
   phoneNumber_country_code: z.string().optional(),
});

// ----------------------------------------------------------------------

const TABS: TabProps[] = [
   {
      value: 'phone',
      icon: <Iconify width={24} icon="solar:smartphone-2-bold-duotone" />,
      label: 'WhatsApp',
   },
   {
      value: 'email',
      icon: <Iconify width={24} icon="solar:letter-bold-duotone" />,
      label: 'Email',
   },
];

export default function SignInView() {
   const router = useRouter();
   const [activeTab, setActiveTab] = useState<string>('phone');
   const { setRegist, sendOTP } = useAuthStore();

   const defaultValues: SignInType = {
      phoneNumber: '',
      email: '',
      phoneNumber_country_code: '',
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(SignInSchema),
      defaultValues,
      values: defaultValues,
   });

   const {
      reset,
      watch,
      control,
      setError,
      clearErrors,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const values = watch();

   const onSubmit = handleSubmit(async (data) => {
      // Bersihkan error sebelumnya
      clearErrors(['phoneNumber', 'email']);

      let isValid = false;

      if (activeTab === 'phone') {
         if (!data.phoneNumber) {
            setError('phoneNumber', { message: 'Phone number is required' });
            return;
         }
         // Validasi nomor via library (opsional, karena Zod sudah cek format)
         if (!isValidPhoneNumber(data.phoneNumber)) {
            setError('phoneNumber', { message: 'Invalid phone number' });
            return;
         }
         isValid = true;
      } else if (activeTab === 'email') {
         if (!data.email) {
            setError('email', { message: 'Email is required' });
            return;
         }
         // Zod sudah validasi format email, jadi cukup cek keberadaan
         isValid = true;
      }

      console.info('DATA', data);
      if (!isValid) return;
      const isUseEmail = activeTab === 'email';
      try {
         const send = await sendOTP(
            {
               login: isUseEmail && data.email ? data.email : (data.phoneNumber ?? ''),
               isEmail: isUseEmail,
               country_code: (data.phoneNumber_country_code ?? 'ID')
            })
         if (send.success) {
            toast.info('Permintaan berhasil, mengalihkan ke halaman verifikasi...')
            setRegist({ isEmail: isUseEmail, phone: data.phoneNumber ?? null, email: data.email ?? null, purpose: send.data?.purpose })
            reset();
            router.push(paths.auth.verify)
         } else {
            toast.error(send.message);
         }
      } catch (error) {
         console.error(error);
      }
   });

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Box
            sx={{ mb: 2 }}
         >
            <Typography variant="h4" gutterBottom>
               Sign in
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
               Masuk menggunakan nomor whatsapp atau email.
            </Typography>
         </Box>
         <Box
            sx={{ mb: 3 }}
         >
            <Tabs
               value={activeTab}
               onChange={(_, newValue) => setActiveTab(newValue)}
            >
               {TABS.map((tab) => (
                  <Tab
                     iconPosition="start"
                     key={tab.value}
                     icon={tab.icon}
                     label={tab.label}
                     value={tab.value}
                     disabled={tab.disabled}
                  />
               ))}
            </Tabs>
         </Box>
         <Box
            sx={{
               rowGap: 2,
               columnGap: 2,
               display: 'grid',
            }}
         >
            {activeTab === 'phone' ? (
               <Field.Phone name="phoneNumber" label="Whatsapp number" defaultCountry="ID" />
            ) : (
               <Field.Text name="email" label="Email address" />
            )
            }
         </Box>

         <Stack sx={{ my: 3, alignItems: 'flex-end' }}>
            <Button
               fullWidth
               color="inherit"
               size="large"
               type="submit"
               variant="contained"
               loading={isSubmitting}
               loadingIndicator="Sign in..."
            >
               Sign in
            </Button>
         </Stack>
         <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Jika tidak ada akun, tetaplah sign in dan akunmu akan otomatis terbuat.
         </Typography>
      </Form>
   );
}
