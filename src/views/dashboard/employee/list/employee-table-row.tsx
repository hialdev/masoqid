import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';

import { useBoolean, usePopover } from 'minimal-shared/hooks';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

import type { EmployeeData } from 'src/stores/employee';

type Props = {
   row: EmployeeData;
   onEditRow: VoidFunction;
   onDeleteRow: VoidFunction;
};

export function EmployeeTableRow({ row, onEditRow, onDeleteRow }: Props) {
   const confirm = useBoolean();
   const popover = usePopover();

   return (
      <>
         <TableRow hover>
            <TableCell>{row.user?.name || row.user?.email || row.user_id}</TableCell>
            <TableCell>{row.nik}</TableCell>
            <TableCell>{row.nip || '-'}</TableCell>
            <TableCell>{row.office?.name || '-'}</TableCell>
            <TableCell>{row.company?.name || '-'}</TableCell>

            <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
               <Tooltip title="Edit" placement="top" arrow>
                  <IconButton color="inherit" onClick={onEditRow}>
                     <Iconify icon="solar:pen-bold" />
                  </IconButton>
               </Tooltip>

               <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
               </IconButton>
            </TableCell>
         </TableRow>

         <CustomPopover
            open={popover.open}
            anchorEl={popover.anchorEl}
            onClose={popover.onClose}
            slotProps={{ arrow: { placement: 'right-top' } }}
         >
            <MenuItem
               onClick={() => {
                  confirm.onTrue();
                  popover.onClose();
               }}
               sx={{ color: 'error.main' }}
            >
               <Iconify icon="solar:trash-bin-trash-bold" />
               Delete
            </MenuItem>
         </CustomPopover>

         <ConfirmDialog
            open={confirm.value}
            onClose={confirm.onFalse}
            title="Delete"
            content="Are you sure want to delete?"
            action={
               <MenuItem
                  onClick={() => {
                     onDeleteRow();
                     confirm.onFalse();
                  }}
                  sx={{ color: 'error.main' }}
               >
                  Delete
               </MenuItem>
            }
         />
      </>
   );
}
