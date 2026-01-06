'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import useAuthStore from 'src/stores/auth';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type SignUpType = z.infer<typeof SignUpSchema>;

export const SignUpSchema = z.object({
   name: z.string().min(1, { error: 'Name is required!' }),
   username: z.string().min(1, { error: 'Username is required!' }),
   email: schemaUtils.email(),
   phoneNumber: schemaUtils.phoneNumber({ isValid: isValidPhoneNumber }),
   phoneNumber_country_code: z.string(),
});

// ----------------------------------------------------------------------

export default function SignUpView() {
   const router = useRouter();
   const { registData, setRegist, register: daftar } = useAuthStore();
   let phoneNumberStr = registData?.phone
         ? String(registData.phone).startsWith('+')
            ? String(registData.phone)
            : `+${registData.phone}`
         : '';
   phoneNumberStr = phoneNumberStr.replace(/\s/g, '');
   const defaultValues: SignUpType = {
      name: '',
      username: '',
      email: registData?.email || '',
      phoneNumber: phoneNumberStr,
      phoneNumber_country_code: parsePhoneNumber(String(phoneNumberStr))?.country || '',
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(SignUpSchema),
      defaultValues,
      values: defaultValues,
   });

   const {
      reset,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const onSubmit = handleSubmit(async (data) => {
      console.log('Submitting:', data);
      try {
         const reg = await daftar({
            name: data.name,
            username: data.username,
            phone: data.phoneNumber,
            country_code: data.phoneNumber_country_code,
            email: data.email,
         });
         if (reg.success) {
            toast.success('Register Successfully!.. now you can login with your account');
            setRegist({ isEmail: false, phone: null, email: null, purpose: null });
            reset();
            router.replace(paths.auth.signIn);
         } else {
            toast.error(`Ooopss, failed register! Error : ${reg.message}`);
         }
      } catch (error: any) {
         toast.error(`${error?.response?.data?.message} - ${error?.response?.data.data}`);
      }
   });

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Box sx={{ mb: 2 }}>
            <Typography variant="h4" gutterBottom>
               Sign up
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
               Lengkapi profile untuk memulai.
            </Typography>
         </Box>
         <Box
            sx={{
               rowGap: 2,
               columnGap: 2,
               display: 'grid',
            }}
         >
            <Field.Text name="name" label="Full name" />
            <Field.Text name="username" label="Username" />
            <Field.Text name="email" label="Email address" />
            <Field.Phone name="phoneNumber" label="Whatsapp number" defaultCountry="ID" />
         </Box>

         <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
            <Button
               fullWidth
               color="inherit"
               size="large"
               type="submit"
               variant="contained"
               loading={isSubmitting}
               loadingIndicator="Sign up..."
            >
               Sign up
            </Button>
         </Stack>
      </Form>
   );
}
