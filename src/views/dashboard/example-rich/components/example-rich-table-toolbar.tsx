import { useState } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { useBoolean } from 'minimal-shared/hooks';

// ----------------------------------------------------------------------

type Props = {
   filters: any;
   onResetPage: () => void;
};

export function ExampleRichTableToolbar({ filters, onResetPage }: Props) {
   const [title, setTitle] = useState(filters.state.title);

   const handleSearch = () => {
      filters.setState({ title });
      onResetPage();
   };

   const handleReset = () => {
      setTitle('');
      filters.setState({ title: '' });
      onResetPage();
   };

   return (
      <Box
         sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
            pb: 0,
         }}
      >
         <TextField
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyUp={(event) => event.key === 'Enter' && handleSearch()}
            placeholder="Search event type..."
            InputProps={{
               startAdornment: (
                  <InputAdornment position="start">
                     <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
               ),
            }}
            sx={{ width: 320 }}
         />
      </Box>
   );
}
