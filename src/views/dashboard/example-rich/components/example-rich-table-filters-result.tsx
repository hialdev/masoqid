import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Iconify } from 'src/components/iconify';

type Props = {
   filters: any;
   totalResults: number;
   onResetPage: () => void;
   sx?: any;
};

export function ExampleRichTableFiltersResult({ filters, totalResults, onResetPage, sx }: Props) {
   const handleReset = () => {
      filters.setState({ title: '' });
      onResetPage();
   };

   return (
      <Box sx={{ typography: 'body2', ...sx }}>
         <Box sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.secondary' }}>
            <Box component="span" sx={{ color: 'text.primary' }}>
               {totalResults}
            </Box>
            <Box component="span" sx={{ ml: 0.25 }}>
               results found
            </Box>
         </Box>

         <Button
            size="small"
            color="error"
            onClick={handleReset}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            sx={{ ml: 1 }}
         >
            Clear
         </Button>
      </Box>
   );
}
