import type { UserData } from 'src/stores/user';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fData } from 'src/utils/format-number';

import useRoleStore from 'src/stores/role';
import useAuthStore from 'src/stores/auth';
import useUserStore from 'src/stores/user';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type UserCUType = z.infer<typeof UserCUSchema>;
export const UserCUSchema = z
   .object({
      name: z.string().min(1, { message: 'Name is required!' }),
      username: z.string().min(1, { message: 'Username is required!' }),
      role: z.object({id: z.string().nullish(), name: z.string(), description: z.string().optional()}).nullish(),
      email: z.string().email({ message: 'Invalid email address!' }).optional(),
      phoneNumber: z
         .string()
         .optional()
         .refine((val) => !val || isValidPhoneNumber(val), {
            message: 'Invalid phone number!',
         }),
      phoneNumber_country_code: z.string().optional(),
      image: schemaUtils.file({ error: 'Avatar Image is required!' }).optional(),
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

      if (hasPhone && (!data.phoneNumber_country_code || data.phoneNumber_country_code.trim() === '')) {
         ctx.addIssue({
            path: ['phoneNumber_country_code'],
            message: 'Country code is required when phone number is provided.',
            code: z.ZodIssueCode.custom,
         });
      }
   });

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
   currentUser?: UserData;
};

export function UserCUForm({ currentUser, open, onClose, onSuccess }: Props) {

   const { authData } = useAuthStore();
   const { update, add } = useUserStore();
   const { roles } = useRoleStore();

   const defaultValues: UserCUType = {
      image: currentUser?.image
         ? process.env.NEXT_PUBLIC_API_HOST + '/' + currentUser.image
         : undefined,
      name: currentUser?.name || '',
      username: currentUser?.username || '',
      role: currentUser?.role ?? null,
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phone ? String(currentUser.phone) : '',
      phoneNumber_country_code: parsePhoneNumber(String(currentUser?.phone))?.country || '',
   };


   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(UserCUSchema),
      defaultValues,
   });

   const {
      reset,
      handleSubmit,
      setValue,
      formState: { isSubmitting },
   } = methods;

   const onSubmit = handleSubmit(async (data) => {
      try {
         if (authData.userId === currentUser?.id) {toast.info("Tidak dapat mengubah role diri sendiri!"); return}; 
         const body = {
            id: currentUser?.id ?? '',
            username: data.username,
            country_code: data.phoneNumber_country_code,
            image: data.image ?? undefined,
            email: data.email,
            phone: data.phoneNumber,
            name: data.name,
            role_id: data.role?.id,
         }
         let gas = undefined;

         if (currentUser) {
            gas = await update({ id: currentUser?.id ?? '', data: body });
         } else {
            gas = await add(body);
         }

         if (gas.success) {
            onSuccess?.()
            reset();
            toast.success(gas.message)
         }
         onClose();

         console.info('DATA', data);
      } catch (error) {
         console.error(error);
      }
   });

   // ------------------------------------------------------------------------------------------


   // ------------------------------------------------------------------------------------------

   return (
      <Dialog
         fullWidth
         maxWidth={false}
         open={open}
         onClose={onClose}
         slotProps={{
            paper: {
               sx: { maxWidth: 720 },
            },
         }}
      >
         <DialogTitle>{currentUser ? 'Update' : 'Add New'} User</DialogTitle>

         <Form methods={methods} onSubmit={onSubmit}>
            <DialogContent sx={{ pt: 1 }}>
               <Box sx={{ mb: 2 }}>
                  <Field.UploadAvatar
                     name="image"
                     maxSize={3145728}
                     helperText={
                        <Typography
                           variant="caption"
                           sx={{
                              mt: 3,
                              mx: 'auto',
                              display: 'block',
                              textAlign: 'center',
                              color: 'text.disabled',
                           }}
                        >
                           Allowed *.jpeg, *.jpg, *.png, *.gif
                           <br /> max size of {fData(3145728)}
                        </Typography>
                     }
                  />
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
                  <Field.Autocomplete
                     name="role" // pastikan ini sesuai field di Formik/Yup
                     label="Select Role"
                     placeholder="Select Role"
                     disableCloseOnSelect
                     options={roles}
                     getOptionLabel={(option) => option.name}
                     getOptionKey={(option) => option.id}
                     isOptionEqualToValue={(option, value) => option.id === value.id}
                     renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                           <Box>
                              <Typography variant="body2" fontWeight="bold">
                                 {option.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 {option.description}
                              </Typography>
                           </Box>
                        </li>
                     )}
                     slotProps={{
                        chip: {
                           color: 'info',
                        },
                     }}
                  />

               </Box>
            </DialogContent>

            <DialogActions>
               <Button variant="outlined" onClick={onClose}>
                  Cancel
               </Button>
               <Button type="submit" variant="contained" loading={isSubmitting}>
                  {currentUser ? 'Update' : 'Add New'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}
