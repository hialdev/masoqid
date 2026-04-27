import type { OfficeData } from 'src/stores/office';

import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/al/paths';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

import { AssignUsersModal } from './assign-users-modal';
import { ImportEmployeesModal } from './import-employees-modal';
import { OfficeEmployeesModal } from './office-employees-modal';

// ----------------------------------------------------------------------

type Props = {
   row: OfficeData;
   selected: boolean;
   onSelectRow: () => void;
   onDeleteRow: () => void;
   onSuccess: () => void;
};

export function OfficeTableRow({ row, selected, onSelectRow, onDeleteRow, onSuccess }: Props) {
   const router = useRouter();
   const menuActions = usePopover();
   const confirmDialog = useBoolean();
   const assignUsersModal = useBoolean();
   const importModal = useBoolean();
   const employeesModal = useBoolean();

   const renderAssignUsersModal = () => (
      <AssignUsersModal
         office={row}
         open={assignUsersModal.value}
         onClose={assignUsersModal.onFalse}
         onSuccess={onSuccess}
      />
   );

   const renderImportModal = () => (
      <ImportEmployeesModal
         open={importModal.value}
         onClose={importModal.onFalse}
         officeId={row.id}
         officeName={row.name}
         onSuccess={onSuccess}
      />
   );

   const renderEmployeesModal = () => (
      <OfficeEmployeesModal
         open={employeesModal.value}
         onClose={employeesModal.onFalse}
         officeId={row.id}
         officeName={row.name}
         userCount={row.user_count || 0}
      />
   );

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
                  router.push(paths.dashboard.office.edit(row.id));
                  menuActions.onClose();
               }}
            >
               <Iconify icon="solar:pen-bold" />
               Edit
            </MenuItem>

            <MenuItem
               onClick={() => {
                  assignUsersModal.onTrue();
                  menuActions.onClose();
               }}
            >
               <Iconify icon="solar:users-group-rounded-bold" />
               Assign Users
            </MenuItem>

            <MenuItem
               onClick={() => {
                  importModal.onTrue();
                  menuActions.onClose();
               }}
            >
               <Iconify icon="solar:import-bold" />
               Import Employees
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
         title="Delete Office"
         content={`Are you sure you want to delete "${row.name}"?`}
         action={
            <Button variant="contained" color="error" onClick={onDeleteRow}>
               Delete
            </Button>
         }
      />
   );

   return (
      <>
         <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
            <TableCell padding="checkbox">
               <Checkbox
                  checked={selected}
                  onClick={onSelectRow}
                  slotProps={{
                     input: {
                        id: `${row.id}-checkbox`,
                        'aria-label': `${row.id} checkbox`,
                     },
                  }}
               />
            </TableCell>

            <TableCell>
               <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                     Lat: {row.latitude.toFixed(6)}, Lng: {row.longitude.toFixed(6)}
                  </Typography>
               </Stack>
            </TableCell>

            <TableCell>
               {row.company ? (
                  <Chip
                     label={row.company.name}
                     size="small"
                     color="secondary"
                     variant="soft"
                  />
               ) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
               )}
            </TableCell>

            <TableCell>
               <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                  {row.address}
               </Typography>
            </TableCell>

            <TableCell align="center">
               <Chip
                  label={row.user_count || 0}
                  size="small"
                  color="primary"
                  variant="soft"
                  onClick={employeesModal.onTrue}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.lighter' } }}
               />
            </TableCell>

            <TableCell>
               <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {row.is_strict_radius ? (
                     <>
                        <Chip label="Strict" size="small" color="error" variant="soft" />
                        {row.radius_for_checkin && (
                           <Chip label="Check-in" size="small" color="primary" variant="soft" />
                        )}
                        {row.radius_for_checkout && (
                           <Chip label="Check-out" size="small" color="warning" variant="soft" />
                        )}
                     </>
                  ) : (
                     <Chip label="Not Strict" size="small" color="default" variant="soft" />
                  )}
               </Box>
            </TableCell>

            <TableCell>
               <IconButton
                  color={menuActions.open ? 'inherit' : 'default'}
                  onClick={menuActions.onOpen}
               >
                  <Iconify icon="eva:more-vertical-fill" />
               </IconButton>
            </TableCell>
         </TableRow>

         {renderAssignUsersModal()}
         {renderImportModal()}
         {renderEmployeesModal()}
         {renderMenuActions()}
         {renderConfirmDialog()}
      </>
   );
}
