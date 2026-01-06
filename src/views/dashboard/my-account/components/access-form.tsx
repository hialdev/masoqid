import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Typography } from '@mui/material';
import { parsePhoneNumber } from 'libphonenumber-js/min';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { toast } from 'sonner';
import { Field, Form, schemaUtils } from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';
import useAuthStore from 'src/stores/auth';
import useProfileStore, { ProfileData } from 'src/stores/profile';
import z from 'zod';

// ----------------------------------------------------------------------

export type ProfileAccessType = z.infer<typeof AccessFormSchema>;
export const AccessFormSchema = z
   .object({
      email: z.string().email({ message: 'Invalid email address!' }).optional(),
      email_code: z.string().optional(),

      phoneNumber: z
         .string()
         .optional()
         .refine((val) => !val || isValidPhoneNumber(val), {
            message: 'Invalid phone number!',
         }),
      phoneNumber_country_code: z.string().optional(),
      phone_code: z.string().optional(),
   })
   .superRefine((data, ctx) => {
      const hasEmail = data.email != null && data.email.trim() !== '';
      const hasPhone = data.phoneNumber != null && data.phoneNumber.trim() !== '';

      if (!hasEmail && !hasPhone) {
         ctx.addIssue({
            path: ['email'],
            message: 'Either email or phone number is required.',
            code: z.ZodIssueCode.custom,
         });
         ctx.addIssue({
            path: ['phoneNumber'],
            message: 'Either email or phone number is required.',
            code: z.ZodIssueCode.custom,
         });
      }

      if (
         hasPhone &&
         (!data.phoneNumber_country_code || data.phoneNumber_country_code.trim() === '')
      ) {
         ctx.addIssue({
            path: ['phoneNumber_country_code'],
            message: 'Country code is required when phone number is provided.',
            code: z.ZodIssueCode.custom,
         });
      }
   });

// ----------------------------------------------------------------------

export default function AccessForm({ currentUser }: { currentUser: ProfileData | null }) {
   const { updateEmail, updatePhone, requestChange } = useProfileStore();
   const { authData } = useAuthStore();
   const [changeOTPDelay, setChangeOTPDelay] = useState(0);
   const [changeOTPInterval, setChangeOTPInterval] = useState<NodeJS.Timeout | null>(null);
   const [showEmailCode, setShowEmailCode] = useState(false);
   const [showPhoneCode, setShowPhoneCode] = useState(false);
   const [lastRequested, setLastRequested] = useState<'email' | 'phone' | null>(null);

   function safeGetCountry(phone?: string | number | null) {
      try {
         if (!phone) return '';
         const parsed = parsePhoneNumber(String(phone));
         return parsed?.country || '';
      } catch (e) {
         return '';
      }
   }

   const defaultValues: ProfileAccessType = {
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phone ? String(currentUser.phone) : '',
      phoneNumber_country_code:
         (currentUser && safeGetCountry(currentUser.phone ? String(currentUser.phone) : '')) || '',
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(AccessFormSchema),
      defaultValues,
   });

   const {
      reset,
      handleSubmit,
      setValue,
      getValues,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      if (currentUser) {
         reset({
            ...defaultValues,
            email_code: '',
            phone_code: '',
         });
         setShowEmailCode(false);
         setShowPhoneCode(false);
         setLastRequested(null);
      }
   }, [currentUser, reset]);

   useEffect(() => {
      if (changeOTPInterval) {
         return () => clearInterval(changeOTPInterval);
      }
   }, [changeOTPInterval]);

   const requestChangeOTP = async (changeFor: 'email' | 'phone') => {
      const email = getValues('email');
      const phone = getValues('phoneNumber');
      const country_code = getValues('phoneNumber_country_code');

      if (changeOTPDelay > 0 && lastRequested === changeFor) {
         toast.error(
            `Please wait ${changeOTPDelay} seconds before requesting another ${changeFor} OTP!`
         );
         return;
      }

      if (changeFor === 'email') {
         if (!email || email === currentUser?.email) {
            toast.error('Please provide a new email!');
            return;
         }
      } else {
         if (!phone || phone === currentUser?.phone) {
            toast.error('Please provide a new phone number!');
            return;
         }
      }

      const resReqChange = await requestChange({
         data: {
            user_id: currentUser?.id ?? '',
            is_email: changeFor === 'email',
            email: changeFor === 'email' ? email : undefined,
            phone: changeFor === 'phone' ? phone : undefined,
            country_code: country_code,
         },
      });

      if (resReqChange.success) {
         toast.success(`OTP sent successfully to your ${changeFor}!`);
         setShowEmailCode(changeFor === 'email' ? true : showEmailCode);
         setShowPhoneCode(changeFor === 'phone' ? true : showPhoneCode);
         setLastRequested(changeFor);

         setChangeOTPDelay(30);
         const interval = setInterval(() => {
            setChangeOTPDelay((prev) => {
               const next = prev - 1;
               if (next <= 0) {
                  clearInterval(interval);
                  setChangeOTPInterval(null);
               }
               return next;
            });
         }, 1000);
         setChangeOTPInterval(interval);
      }
   };

   const onSubmit = handleSubmit(async (data) => {
      try {
         if (data.email && data.email_code) {
            const responseEmail = await updateEmail({
               data: { email: data.email, code: data.email_code },
            });
            if (responseEmail.success) {
               toast.success('Email updated successfully!');
            }
         }

         if (data.phoneNumber && data.phone_code) {
            const responsePhone = await updatePhone({
               data: {
                  phone: data.phoneNumber,
                  code: data.phone_code,
                  country_code: data.phoneNumber_country_code ?? '',
               },
            });
            if (responsePhone.success) {
               toast.success('Phone updated successfully!');
            }
         }
      } catch (error) {
         console.error(error);
      }
   });

   const renderForm = () => {
      const isEmailVerifyDisabled = changeOTPDelay > 0 && lastRequested === 'email';
      const isPhoneVerifyDisabled = changeOTPDelay > 0 && lastRequested === 'phone';

      const emailButtonText = isEmailVerifyDisabled ? `Verify (${changeOTPDelay}s)` : 'Verify';
      const phoneButtonText = isPhoneVerifyDisabled ? `Verify (${changeOTPDelay}s)` : 'Verify';

      return (
         <Form methods={methods} onSubmit={onSubmit}>
            <Box display="grid" gap={2}>
               {/* Email Update */}
               <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                     <Field.Text name="email" label="Email" />
                     <Button
                        variant="contained"
                        onClick={() => requestChangeOTP('email')}
                        disabled={isEmailVerifyDisabled}
                     >
                        {emailButtonText}
                     </Button>
                  </Box>
                  {showEmailCode && <Field.Code name="email_code" />}
               </Box>

               {/* Phone Update */}
               <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                     <Field.Phone name="phoneNumber" label="Whatsapp number" defaultCountry="ID" />
                     <Button
                        variant="contained"
                        onClick={() => requestChangeOTP('phone')}
                        disabled={isPhoneVerifyDisabled}
                     >
                        {phoneButtonText}
                     </Button>
                  </Box>
                  {showPhoneCode && <Field.Code name="phone_code" />}
               </Box>

               <Button type="submit" sx={{ mt: 2 }} variant="contained" loading={isSubmitting}>
                  Update Access
               </Button>
            </Box>
         </Form>
      );
   };

   if (!currentUser) {
      return (
         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <LoadingScreen />
         </Box>
      );
   }

   return <>{renderForm()}</>;
}
