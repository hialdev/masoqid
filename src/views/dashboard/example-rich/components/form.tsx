import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Grid from '@mui/material/Grid';
import { InputAdornment, Typography } from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { slugify } from '../helpers/slug';
import { useEffect, useState } from 'react';
import useExampleRichStore from 'src/stores/example-rich';
import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';
import { ExampleRichType, ExampleRichSchema } from 'src/types/example-rich';

// ----------------------------------------------------------------------

type Props = {
   onSuccess?: () => void;
   currentExampleRich?: ExampleRichType;
};

export function ExampleRichForm({ currentExampleRich, onSuccess }: Props) {
   const router = useRouter();
   const [slug, setSlug] = useState<string>(currentExampleRich?.slug ?? '');

   let parsedGalleries: any[] = [];

   if (typeof currentExampleRich?.galleries === 'string' && currentExampleRich.galleries !== '') {
      try {
         parsedGalleries = JSON.parse(currentExampleRich.galleries);
      } catch (err) {
         console.error('Invalid JSON galleries:', err);
      }
   }

   // Default values for the form
   const defaultValues: ExampleRichType = {
      title: currentExampleRich?.title || '',
      slug: currentExampleRich?.slug || '',
      description: currentExampleRich?.description || '',
      image:
         typeof currentExampleRich?.image === 'string' && currentExampleRich?.image
            ? `${CONFIG.apiHostUrl}/${currentExampleRich.image}`
            : currentExampleRich?.image,
      content: currentExampleRich?.content || '',
      galleries:
         parsedGalleries && Array.isArray(parsedGalleries)
            ? parsedGalleries.map((gallery) =>
                 typeof gallery === 'string' ? `${CONFIG.apiHostUrl}/${gallery}` : gallery
              )
            : [],
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(ExampleRichSchema),
      defaultValues,
   });

   const {
      reset,
      handleSubmit,
      control,
      setValue,
      watch,
      formState: { isSubmitting },
   } = methods;

   const { add, update } = useExampleRichStore();

   const onSubmit = handleSubmit(async (data) => {
      try {
         console.info('Example Rich Form Data:', data);

         // Process galleries to separate files from URLs
         const processedGalleries =
            data.galleries?.filter((gallery) => gallery instanceof File) || [];

         // Manually include the slug value since the field is disabled
         const formData = {
            ...data,
            slug: slug || data.slug,
            galleries: processedGalleries,
         };

         let result;
         if (currentExampleRich?.id) {
            // Update existing Example Rich
            result = await update({ id: currentExampleRich.id, data: formData });
         } else {
            // Create new Example Rich
            result = await add({ data: formData });
         }

         if (result.success) {
            toast.success(
               currentExampleRich
                  ? 'Example Rich updated successfully!'
                  : 'Example Rich created successfully!'
            );
            onSuccess?.();
            reset();
            router.push(paths.dashboard.example_rich.root);
         } else {
            toast.error(result.message || 'An error occurred while saving the Example Rich');
         }
      } catch (error) {
         console.error(error);
         toast.error('An error occurred while saving the Example Rich');
      }
   });

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Box sx={{ pt: 1, pb: 0, flexGrow: 1, overflow: 'auto' }}>
            <Grid container spacing={3}>
               {/* Left Column - Basic Info */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                     <Field.Upload
                        name="image"
                        maxSize={5242880} // 5MB
                        helperText={
                           <Typography
                              variant="caption"
                              sx={{
                                 mt: 1,
                                 display: 'block',
                                 textAlign: 'center',
                                 color: 'text.disabled',
                              }}
                           >
                              Allowed *.jpeg, *.jpg, *.png, max size of 5MB
                           </Typography>
                        }
                     />
                  </Box>

                  <Grid container spacing={3}>
                     <Grid size={{ xs: 12 }} sx={{ mb: 1 }}>
                        <Field.Text
                           name="title"
                           label="Example Rich Title"
                           fullWidth
                           onBlur={(e) => setSlug(slugify(e.target.value))}
                        />
                     </Grid>
                     <Grid size={{ xs: 12 }} sx={{ mb: 1 }}>
                        <Field.Text
                           name="slug"
                           label="Slug"
                           fullWidth
                           value={slug}
                           disabled
                           helperText="URL-friendly version of the title"
                        />
                     </Grid>
                     <Grid size={{ xs: 12 }} sx={{ mb: 3 }}>
                        <Field.Text
                           multiline
                           name="description"
                           label="Description"
                           minRows={3}
                           fullWidth
                           helperText="Also used as SEO meta description"
                        />
                     </Grid>
                  </Grid>
               </Grid>

               {/* Right Column - Content and Galleries */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                     <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Example Rich Content
                     </Typography>
                     <Field.Editor name="content" />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                     <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Galleries
                     </Typography>
                     <Field.Upload
                        name="galleries"
                        maxSize={5242880} // 5MB
                        multiple
                        helperText={
                           <Typography
                              variant="caption"
                              sx={{
                                 mt: 1,
                                 display: 'block',
                                 textAlign: 'center',
                                 color: 'text.disabled',
                              }}
                           >
                              Allowed *.jpeg, *.jpg, *.png, max size of 5MB each
                           </Typography>
                        }
                     />
                  </Box>
               </Grid>
            </Grid>
         </Box>

         <Box sx={{ position: 'sticky', bottom: 0, end: 0, start: 0, zIndex: 99, pb: 2 }}>
            <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
               {currentExampleRich ? 'Update' : 'Add New'}
            </Button>
         </Box>
      </Form>
   );
}
