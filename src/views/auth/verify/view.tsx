'use client';

import * as z from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/al/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import useAuthStore from 'src/stores/auth';
import { EmailInboxIcon } from 'src/assets/icons';

import { Form, Field } from 'src/components/hook-form';
import { FormHead } from 'src/auth/components/form-head';
import { FormResendCode } from 'src/auth/components/form-resend-code';
import { FormReturnLink } from 'src/auth/components/form-return-link';

// ----------------------------------------------------------------------

export type VerifySchemaType = z.infer<typeof VerifySchema>;

export const VerifySchema = z.object({
   code: z
      .string()
      .min(1, { message: 'Code is required!' })
      .min(6, { message: 'Code must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

export function VerifyView() {
   const { registData, validateOTP, login, setRegist: setRegistData } = useAuthStore(); // ← tambahkan setRegistData
   const router = useRouter();
   const searchParams = useSearchParams();

   const defaultValues: VerifySchemaType = { code: '' };

   const methods = useForm({
      resolver: zodResolver(VerifySchema),
      defaultValues,
   });

   const {
      handleSubmit,
      reset,
      formState: { isSubmitting },
   } = methods;

   const hasAutoSubmitted = useRef(false);

   // Fungsi submit manual (tetap dipakai saat user klik tombol)
   const onSubmit = handleSubmit(async (data) => {
      if (!registData.purpose) {
         router.replace(paths.auth.signIn);
         return;
      }

      try {
         let fetch;
         const isLogin = registData.purpose === 'login';
         if (isLogin) {
            const bodyLogin = {
               login: registData.isEmail ? registData.email : registData.phone,
               code: data.code,
               purpose: registData.purpose,
            };
            fetch = await login(bodyLogin);
         } else {
            const bodyRegist = { code: data.code, purpose: registData.purpose };
            fetch = await validateOTP(bodyRegist);
         }

         if (fetch?.success) {
            router.replace(isLogin ? paths.dashboard.root : paths.auth.signUp);
         } else {
            toast.error(fetch?.message || 'Verification failed');
         }
      } catch (error: any) {
         toast.error(
            `${error?.response?.data?.message || 'Error'} - ${error?.response?.data?.data || ''}`
         );
      }
   });

   // 🔁 Auto-submit dari URL
   useEffect(() => {
      if (hasAutoSubmitted.current) return;

      const phone = searchParams.get('phone');
      const email = searchParams.get('email'); // opsional, jika suatu saat ada
      const code = searchParams.get('code');
      const purpose = searchParams.get('purpose');

      // Validasi dasar
      if (!code || code.length < 6 || !purpose) return;

      // Tentukan apakah ini berbasis email atau phone
      const isEmail = !!email;
      const loginValue = email || phone; // untuk login
      const hasContact = isEmail || !!phone;

      if (!hasContact) return;

      // 🔁 Jika ini registrasi, pastikan registData diisi
      if (purpose === 'register') {
         setRegistData({
            email: isEmail ? email : null,
            phone: !isEmail ? phone : null,
            isEmail,
            purpose: 'register',
         });
      }

      // Isi form dan submit
      reset({ code });
      hasAutoSubmitted.current = true;

      // Submit otomatis
      setTimeout(() => {
         handleSubmit(async (data) => {
            try {
               let fetch;
               if (purpose === 'login') {
                  const bodyLogin = { login: loginValue, code: data.code, purpose };
                  fetch = await login(bodyLogin);
               } else {
                  // Untuk register, pastikan registData sudah di-set di atas
                  const bodyRegist = { code: data.code, purpose: purpose };
                  fetch = await validateOTP(bodyRegist);
               }

               if (fetch?.success) {
                  router.replace(purpose === 'login' ? paths.dashboard.root : paths.auth.signUp);
               } else {
                  toast.error(fetch?.message || 'Verification failed');
               }
            } catch (error: any) {
               toast.error(
                  `${error?.response?.data?.message || 'Error'} - ${error?.response?.data?.data || ''}`
               );
            }
         })();
      }, 100);
   }, [searchParams, reset, handleSubmit, login, validateOTP, router, setRegistData]);

   const renderForm = () => (
      <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
         <Field.Code name="code" />
         <Button
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Verify..."
         >
            Verify
         </Button>
      </Box>
   );

   return (
      <>
         <FormHead
            icon={<EmailInboxIcon />}
            title="Periksa Email / WhatsApp anda!"
            description="Kami telah mengirimkan 6-digit kode OTP ke Email / WhatsApp anda! masukan kode tersebut untuk melanjutkan."
         />

         <Form methods={methods} onSubmit={onSubmit}>
            {renderForm()}
         </Form>

         <FormResendCode onResendCode={() => {}} value={0} disabled={false} />

         <FormReturnLink href={paths.auth.signIn} label="kembali ke halaman masuk" />
      </>
   );
}
