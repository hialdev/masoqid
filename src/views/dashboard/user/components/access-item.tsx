import { useBoolean, usePopover } from "minimal-shared/hooks";

import { Box, Card, Chip, Button, Tooltip, MenuItem, MenuList, IconButton, Typography, CardContent } from "@mui/material";

import { Iconify } from "src/components/iconify";
import { ConfirmDialog } from "src/components/custom-dialog";
import { CustomPopover } from "src/components/custom-popover";

import { AccessCUForm } from "../forms/access-cu-form";

type Props = {
   role: any,
   onSuccess: () => void,
}

export default function AccessItem({ role, onSuccess }: Props) {
   const editDialog = useBoolean()
   const confirmDialog = useBoolean()
   const menuActions = usePopover();
   // -----------------------------------------------------------------------------------------
   const handleDelete = () => {
      editDialog.onFalse()
      onSuccess()
   }

   const handleEditSuccess = () => {
      editDialog.onFalse()
      onSuccess()
   }
   // -----------------------------------------------------------------------------------------

   const renderMenuActions = () => (
      <CustomPopover
         open={menuActions.open}
         anchorEl={menuActions.anchorEl}
         onClose={menuActions.onClose}
         slotProps={{ arrow: { placement: 'right-top' } }}
      >
         <MenuList>
            <MenuItem
               onClick={() => {
                  editDialog.onTrue();
                  menuActions.onClose();
               }}
            >
               <Iconify icon="solar:pen-bold" />
               Edit
            </MenuItem>
            <MenuItem
               onClick={() => {
                  confirmDialog.onTrue();
                  menuActions.onClose();
               }}
               sx={{ color: 'error.main' }}
            >
               <Iconify icon="solar:trash-bin-trash-bold" />
               Delete
            </MenuItem>
         </MenuList>
      </CustomPopover>
   );

   const renderConfirmDialog = () => (
      <ConfirmDialog
         open={confirmDialog.value}
         onClose={confirmDialog.onFalse}
         title="Delete"
         content="Are you sure want to delete?"
         action={
            <Button variant="contained" color="error" onClick={handleDelete}>
               Delete
            </Button>
         }
      />
   );

   const renderEditDialog = () => (
      <AccessCUForm
         currentAccess={role}
         open={editDialog.value}
         onSuccess={handleEditSuccess}
         onClose={editDialog.onFalse}
      />
   )

   return (
      <Card>
            <CardContent>
               <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
                  <Box>
                     <Typography typography="h6">{role.name}</Typography>
                     <Typography>{role.description}</Typography>
                  </Box>
                  <IconButton
                     color={menuActions.open ? 'inherit' : 'default'}
                     onClick={menuActions.onOpen}
                  >
                     <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
               </Box>
               <Box display="flex" flexWrap="wrap" gap={1}>
                  {role.permissions.map((permission:any, i:number) => (
                     <Tooltip key={i} title={permission.description} placement="bottom" arrow>
                        <Chip label={permission.name} />
                     </Tooltip>
                  ))}
               </Box>
            </CardContent>

            {renderMenuActions()}
            {renderEditDialog()}
            {renderConfirmDialog()}
         </Card>
   )
}