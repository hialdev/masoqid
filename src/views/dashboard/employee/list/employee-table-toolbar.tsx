import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { Iconify } from 'src/components/iconify';

type Props = {
   searchQuery: string;
   onSearch: (val: string) => void;
};

export function EmployeeTableToolbar({ searchQuery, onSearch }: Props) {
   return (
      <Stack
         spacing={2}
         alignItems={{ xs: 'flex-end', md: 'center' }}
         direction={{ xs: 'column', md: 'row' }}
         sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
      >
         <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search employee..."
            InputProps={{
               startAdornment: (
                  <InputAdornment position="start">
                     <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
               ),
            }}
         />
      </Stack>
   );
}
