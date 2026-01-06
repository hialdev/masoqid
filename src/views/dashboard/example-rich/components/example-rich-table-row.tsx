import { useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useBoolean } from 'minimal-shared/hooks';
import { toast } from 'src/components/snackbar';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

type Props = {
   row: any;
   selected: boolean;
   onSelectRow: () => void;
   onDeleteRow: () => void;
   editHref: string;
   onSuccessEdit: () => void;
};

export function ExampleRichTableRow({
   row,
   selected,
   onSelectRow,
   onDeleteRow,
   editHref,
   onSuccessEdit,
}: Props) {
   const { id, title, slug, description, image } = row;

   const confirm = useBoolean();

   return (
      <>
         <TableRow hover selected={selected}>
            <TableCell padding="checkbox">
               <Checkbox checked={selected} onClick={onSelectRow} />
            </TableCell>

            <TableCell>
               <Box
                  component="img"
                  src={image ? `${process.env.NEXT_PUBLIC_API_HOST}/${image}` : '/assets/empty-content/placeholder.jpg'}
                  sx={{ width: 48, height: 48, borderRadius: 1, flexShrink: 0 }}
               />
            </TableCell>

            <TableCell>
               <Typography variant="subtitle2" noWrap>
                  {title}
               </Typography>
            </TableCell>

            <TableCell>
               <Typography noWrap>{slug}</Typography>
            </TableCell>

            <TableCell>
               <Typography noWrap sx={{ maxWidth: 300 }}>
                  {description}
               </Typography>
            </TableCell>

            <TableCell align="right">
               <Link href={editHref} color="inherit">
                  <IconButton color={confirm.value ? 'primary' : 'default'}>
                     <Iconify icon="solar:pen-bold" />
                  </IconButton>
               </Link>

               <IconButton color="error" onClick={confirm.onTrue}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
               </IconButton>
            </TableCell>
         </TableRow>

         <ConfirmDialog
            open={confirm.value}
            onClose={confirm.onFalse}
            title="Delete"
            content="Are you sure want to delete?"
            action={
               <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                     onDeleteRow();
                     confirm.onFalse();
                  }}
               >
                  Delete
               </Button>
            }
         />
      </>
   );
}
