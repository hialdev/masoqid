import type { OfficeData } from 'src/stores/office';

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
   office: OfficeData;
   open: boolean;
   onClose: () => void;
   onSuccess: () => void;
};

export function AssignUsersModal({ office, open, onClose, onSuccess }: Props) {
   const { all: getAllUsers } = useUserStore();
   const { assignUsers } = useOfficeStore();

   const [users, setUsers] = useState<any[]>([]);
   const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (open) {
         fetchUsers();
      }
   }, [open]);

   const fetchUsers = async () => {
      try {
         const res = await getAllUsers({ page: 1, limit: 1000, sort: 'created_at', order: 'desc' });
         if (res.success) {
            setUsers(res.data.users || []);

            // Set default selected users (users already assigned to this office)
            if (office.users) {
               setSelectedUsers(office.users);
            }
         }
      } catch (error) {
         toast.error('Failed to fetch users');
      }
   };

   const handleSubmit = async () => {
      try {
         setLoading(true);
         const userIds = selectedUsers.map((user) => user.id);

         const result = await assignUsers(office.id, userIds);

         if (result.success) {
            toast.success(result.message || 'Users assigned successfully');
            onSuccess();
            onClose();
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Failed to assign users');
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Assign Users to {office.name}</DialogTitle>

         <DialogContent>
            <Box sx={{ pt: 1 }}>
               <Autocomplete
                  multiple
                  options={users}
                  value={selectedUsers}
                  onChange={(e, newValue) => setSelectedUsers(newValue)}
                  getOptionLabel={(option) => option.name || option.username || 'Unknown'}
                  renderInput={(params) => (
                     <TextField {...params} label="Select Users" placeholder="Search users..." />
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
