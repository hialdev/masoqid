import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import useUserStore from 'src/stores/user';
import useOfficeStore from 'src/stores/office';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Props = {
   user: any;
   open: boolean;
   onClose: () => void;
   onSuccess: () => void;
};

export function AssignOfficeModal({ user, open, onClose, onSuccess }: Props) {
   const { getAll: getAllOffices } = useOfficeStore();
   const { assignOffice } = useUserStore();

   const [offices, setOffices] = useState<any[]>([]);
   const [selectedOffice, setSelectedOffice] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (open) {
         fetchOffices();
      }
   }, [open]);

   const fetchOffices = async () => {
      try {
         await getAllOffices({ page: 1, limit: 1000 });
      } catch (error) {
         toast.error('Failed to fetch offices');
      }
   };

   useEffect(() => {
      // Get offices from store
      const officeStore = useOfficeStore.getState();
      setOffices(officeStore.offices || []);

      // Set default selected office if user has one
      if (user.office) {
         setSelectedOffice(user.office);
      }
   }, [user, open]);

   const handleSubmit = async () => {
      try {
         setLoading(true);
         const officeId = selectedOffice?.id || null;

         const result = await assignOffice(user.id, officeId);

         if (result.success) {
            toast.success(result.message || 'Office assigned successfully');
            onSuccess();
            onClose();
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Failed to assign office');
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Assign Office to {user.name}</DialogTitle>

         <DialogContent>
            <Box sx={{ pt: 1 }}>
               <Autocomplete
                  options={offices}
                  value={selectedOffice}
                  onChange={(e, newValue) => setSelectedOffice(newValue)}
                  getOptionLabel={(option) => option.name || 'Unknown'}
                  renderInput={(params) => (
                     <TextField {...params} label="Select Office" placeholder="Search offices..." />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
               />
            </Box>
         </DialogContent>

         <DialogActions>
            <Button onClick={onClose} color="inherit">
               Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
               {loading ? 'Assigning...' : 'Assign'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}
