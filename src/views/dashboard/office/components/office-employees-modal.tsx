import type { FC } from 'react';
import { useState, useEffect } from 'react';

import {
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Button,
   Box,
   Typography,
   Avatar,
   Stack,
   List,
   ListItem,
   ListItemAvatar,
   ListItemText,
   CircularProgress,
   InputAdornment,
   TextField,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import useOfficeStore from 'src/stores/office';

// ----------------------------------------------------------------------

type User = {
   id: string;
   name: string;
   username: string;
   email?: string;
   phone?: string;
   image?: string;
};

type Props = {
   open: boolean;
   onClose: () => void;
   officeId: string;
   officeName: string;
   userCount: number;
};

export const OfficeEmployeesModal: FC<Props> = ({
   open,
   onClose,
   officeId,
   officeName,
   userCount,
}) => {
   const { getOfficeUsers } = useOfficeStore();
   const [users, setUsers] = useState<User[]>([]);
   const [loading, setLoading] = useState(false);
   const [search, setSearch] = useState('');

   useEffect(() => {
      if (open && officeId) {
         fetchUsers();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open, officeId]);

   const fetchUsers = async () => {
      setLoading(true);
      try {
         const data = await getOfficeUsers(officeId);
         setUsers(data || []);
      } catch (error) {
         console.error('Failed to fetch office users:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleClose = () => {
      setSearch('');
      onClose();
   };

   const filteredUsers = users.filter((user) => {
      const query = search.toLowerCase();
      return (
         user.name.toLowerCase().includes(query) ||
         user.username.toLowerCase().includes(query) ||
         (user.email && user.email.toLowerCase().includes(query)) ||
         (user.phone && user.phone.includes(query))
      );
   });

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
               <Box>
                  <Typography variant="h6">{officeName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                     {userCount} Employees
                  </Typography>
               </Box>
            </Stack>
         </DialogTitle>

         <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ p: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
               <TextField
                  fullWidth
                  size="small"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" color="text.disabled" />
                        </InputAdornment>
                     ),
                  }}
               />
            </Box>

            {loading ? (
               <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CircularProgress size={30} />
               </Box>
            ) : (
               <List disablePadding>
                  {filteredUsers.length > 0 ? (
                     filteredUsers.map((user) => (
                        <ListItem key={user.id} divider>
                           <ListItemAvatar>
                              <Avatar src={user.image} alt={user.name}>
                                 {user.name.charAt(0).toUpperCase()}
                              </Avatar>
                           </ListItemAvatar>
                           <ListItemText
                              primary={
                                 <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle2">{user.name}</Typography>
                                    <Typography variant="caption" color="text.disabled">
                                       @{user.username}
                                    </Typography>
                                 </Stack>
                              }
                              secondary={
                                 <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                    {user.email && (
                                       <Stack direction="row" alignItems="center" spacing={0.5}>
                                          <Iconify
                                             icon="eva:email-fill"
                                             width={14}
                                             color="text.disabled"
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                             {user.email}
                                          </Typography>
                                       </Stack>
                                    )}
                                    {user.phone && (
                                       <Stack direction="row" alignItems="center" spacing={0.5}>
                                          <Iconify
                                             icon="eva:phone-fill"
                                             width={14}
                                             color="text.disabled"
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                             {user.phone}
                                          </Typography>
                                       </Stack>
                                    )}
                                 </Stack>
                              }
                           />
                        </ListItem>
                     ))
                  ) : (
                     <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                           {users.length === 0 ? 'No employees assigned' : 'No employees found'}
                        </Typography>
                     </Box>
                  )}
               </List>
            )}
         </DialogContent>

         <DialogActions>
            <Button onClick={handleClose}>Close</Button>
         </DialogActions>
      </Dialog>
   );
};
