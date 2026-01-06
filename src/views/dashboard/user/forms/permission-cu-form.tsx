import type { PermissionData } from 'src/stores/permission';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import usePermissionStore from 'src/stores/permission';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

export type PermissionCUType = z.infer<typeof PermissionObjectSchema>;

export const PermissionObjectSchema = z
   .object({
      name: z.string().min(1, { message: 'Name is required!' }),
      description: z.string().optional(),
   });

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
   currentPermission?: PermissionData;
};

export function PermissionCUForm({ currentPermission, open, onClose, onSuccess }: Props) {

   const { update, add } = usePermissionStore();

   const defaultValues = {
      name: currentPermission?.name || '',
      description: currentPermission?.description || '',
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(PermissionObjectSchema),
      defaultValues,
      values: defaultValues,
   });

   const {
      reset,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const onSubmit = handleSubmit(async (data) => {
      try {
         const body = {
            name: data.name,
            description: data.description,
            ...(currentPermission && { id: currentPermission.id }),
         }

         let gas = undefined;

         if (currentPermission) {
            gas = await update({ id: currentPermission?.id ?? '', data: body });
         } else {
            gas = await add({data: body});
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
         <DialogTitle>{currentPermission ? 'Update' : 'Add New'} Permission</DialogTitle>

         <Form methods={methods} onSubmit={onSubmit}>
            <DialogContent sx={{ pt: 1 }}>
               <Box
                  sx={{
                     rowGap: 2,
                     columnGap: 2,
                     display: 'grid',
                  }}
               >
                  <Field.Text name="name" label="Full name" />
                  <Field.Text name="description" label="Description" multiline rows={2} />
               </Box>
            </DialogContent>

            <DialogActions>
               <Button variant="outlined" onClick={onClose}>
                  Cancel
               </Button>
               <Button type="submit" variant="contained" loading={isSubmitting}>
                  {currentPermission ? 'Update' : 'Add New'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}
