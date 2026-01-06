import type { UserData } from 'src/stores/user';

import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import { Chip, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

import { UserCUForm } from '../forms/user-cu-form';


// ----------------------------------------------------------------------

type Props = {
   row: UserData;
   selected: boolean;
   editHref: string;
   onSelectRow: () => void;
   onDeleteRow: () => void;
   onSuccessEdit: () => void;
};

export function UserTableRow({ row, selected, editHref, onSelectRow, onDeleteRow, onSuccessEdit }: Props) {
   const menuActions = usePopover();
   const confirmDialog = useBoolean();
   const quickEditForm = useBoolean();

   const renderQuickEditForm = () => (
      <UserCUForm
         currentUser={row}
         open={quickEditForm.value}
         onSuccess={onSuccessEdit}
         onClose={quickEditForm.onFalse}
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
               <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
                  <Avatar alt={row.name && row.name != "" ? row.name: 'AL User Gans'} src={row.image ? process.env.NEXT_PUBLIC_API_HOST+'/'+row.image : ''} />

                  <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
                     <Typography
                        typography="body"
                     >
                        {row.name && row.name != "" ? row.name: '---'}
                     </Typography>
                     <Box component="span" sx={{ color: 'text.disabled' }}>
                        @{row.username && row.username != "" ? row.username: '---'}
                     </Box>
                  </Stack>
               </Box>
            </TableCell>

            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.phone && row.phone != "" ? row.phone: '---'}</TableCell>

            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.email && row.email != "" ? row.email: '---'}</TableCell>

            <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip variant='soft' color='info' label={row.role_id ? row.role?.name : 'not set'} /></TableCell>

            <TableCell>
               <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Quick edit" placement="top" arrow>
                     <IconButton
                        color={quickEditForm.value ? 'inherit' : 'default'}
                        onClick={quickEditForm.onTrue}
                     >
                        <Iconify icon="solar:pen-bold" />
                     </IconButton>
                  </Tooltip>

                  <IconButton
                     color={menuActions.open ? 'inherit' : 'default'}
                     onClick={menuActions.onOpen}
                  >
                     <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
               </Box>
            </TableCell>
         </TableRow>

         {renderQuickEditForm()}
         {renderMenuActions()}
         {renderConfirmDialog()}
      </>
   );
}
