import type { RoleData } from 'src/stores/role';
import type { PermissionData } from 'src/stores/permission';

import * as z from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import useRoleStore from 'src/stores/role';
import usePermissionStore from 'src/stores/permission';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type AccessCUType = z.infer<typeof AccessCUSchema>;

const PermissionObjectSchema = z.object({
   id: z.uuid().optional(),
   name: z.string(),
   description: z.string().optional(),
   created_at: z.string().optional(),
   updated_at: z.string().optional(),
});

export const AccessCUSchema = z
   .object({
      name: z.string().min(1, { message: 'Name is required!' }),
      description: z.string().optional(),
      permissions: z.array(PermissionObjectSchema),
   });

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
   currentAccess?: RoleData;
};

export function AccessCUForm({ currentAccess, open, onClose, onSuccess }: Props) {
   const { add, update } = useRoleStore()
   const { permissions, all } = usePermissionStore()

   const defaultValues = {
      name: currentAccess?.name || '',
      description: currentAccess?.description || '',
      permissions:
         currentAccess?.permissions
            ?.map(p => {
               if (typeof p === 'string' && p.trim() !== '') {
                  return permissions.find(perm => perm.id === p)
                     ?? { id: p, name: p, description: '' };
               }
               if (p && typeof p === 'object' && p.id) {
                  return p;
               }
               return null; // skip invalid
            })
            .filter((p): p is PermissionData => p !== null)
         ?? [],
   };

   const methods = useForm<AccessCUType>({
      mode: 'onSubmit',
      resolver: zodResolver(AccessCUSchema),
      defaultValues,
      values: defaultValues,
   });

   const {
      reset,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   // ------------------------------------------------------------------------------------------

   const fetchData = async () => {
      all()
   }

   const onSubmit = handleSubmit(async (data) => {
      try {
         const validPermissionIds = data.permissions
            .map(p => p.id)
            .filter((id): id is string => !!id);

         let body: RoleData = {
            name: data.name,
            description: data.description,
            permissions: validPermissionIds,
         };

         let gas = undefined
         if (currentAccess) {
            body = {
               ...body,
               id: currentAccess.id
            };
            gas = await update({ id: currentAccess.id ?? '', data: body });
         } else {
            gas = await add({ data: body });
         }

         if (gas.success){
            toast.success(gas.message)
            onSuccess?.()
         }else{
            toast.error(gas.message)
         }

      } catch (error) {
         console.error(error);
      }
   });

   // ------------------------------------------------------------------------------------------

   useEffect(() => {
      fetchData()
   }, [])

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
         <DialogTitle>{currentAccess ? 'Update' : 'Add New'} Access</DialogTitle>

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
                  <Field.Autocomplete
                     name="permissions" // pastikan ini sesuai field di Formik/Yup
                     label="Permissions"
                     placeholder="+ permission"
                     multiple
                     disableCloseOnSelect
                     options={permissions} // array objek permission
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
                  {currentAccess ? 'Update' : 'Add New'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}
