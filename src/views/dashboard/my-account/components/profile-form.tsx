import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field, Form, schemaUtils } from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';
import useProfileStore, { ProfileData } from 'src/stores/profile';
import { fData } from 'src/utils/format-number';
import z from 'zod';

// ----------------------------------------------------------------------

export type ProfileType = z.infer<typeof ProfileFormSchema>;
export const ProfileFormSchema = z.object({
   name: z.string().min(1, { message: 'Name is required!' }),
   username: z.string().min(1, { message: 'Username is required!' }),
   image: schemaUtils.file({ error: 'Avatar Image is required!' }).optional(),
});

// ----------------------------------------------------------------------

export default function ProfileForm({ currentUser }: { currentUser: ProfileData | null }) {
   const { updateBasic } = useProfileStore();

   const defaultValues: ProfileType = {
      image: null,
      name: "",
      username: "",
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(ProfileFormSchema),
      defaultValues
   });


   const {
      reset,
      handleSubmit,
      setValue,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      if (currentUser) {
         reset({
            image: currentUser.image
               ? process.env.NEXT_PUBLIC_API_HOST + '/' + currentUser.image
               : null,
            name: currentUser.name ?? '',
            username: currentUser.username ?? '',
         });
      }
   }, [currentUser, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         const body = {
            username: data.username,
            name: data.name,
            image: data.image ?? undefined,
         };

         const response = await updateBasic({ data: body });

         if (response.success) {
            toast.success('Profile updated successfully!');
         }

      } catch (error) {
         console.error(error);
      }
   });

   const renderForm = () => {
      return (
         <Form methods={methods} onSubmit={onSubmit}>
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
                        Allowed *.jpeg, *.jpg, *.png, *.gif, *.svg, *.webp
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
            </Box>

            <Button type="submit" sx={{ mt: 2 }} variant="contained" loading={isSubmitting}>
               Update Profile
            </Button>
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
