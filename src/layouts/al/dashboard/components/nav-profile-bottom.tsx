import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import useAuthStore from 'src/stores/auth';
import { SignOutButton } from 'src/layouts/components/sign-out-button';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function NavProfileBottom({ sx, ...other }: BoxProps) {
   const { user } = useAuthStore();

   return (
      <Box
         sx={[{ px: 2, py: 5, textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
         {...other}
      >
         <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <Box sx={{ position: 'relative' }}>
               <Avatar src={user?.image ? process.env.NEXT_PUBLIC_API_HOST + '/' + user.image : ''} alt={user?.name} sx={{ width: 48, height: 48}}>
                  {user?.name?.charAt(0).toUpperCase()}
               </Avatar>

               <Label
                  color="success"
                  variant="filled"
                  sx={{
                     top: -6,
                     px: 0.5,
                     left: 40,
                     height: 20,
                     position: 'absolute',
                     borderBottomLeftRadius: 2,
                  }}
               >
                  {user?.role?.name || "not set"}
               </Label>
            </Box>

            <Box sx={{ mb: 2, mt: 1.5, width: 1 }}>
               <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{ mb: 1, color: 'var(--layout-nav-text-primary-color)' }}
               >
                  {user?.name}
               </Typography>

               <Typography
                  variant="body2"
                  noWrap
                  sx={{ color: 'var(--layout-nav-text-disabled-color)' }}
               >
                  {user?.email}
               </Typography>
            </Box>

            <SignOutButton showLabel={false} fullWidth={false} />
         </Box>
      </Box>
   );
}
