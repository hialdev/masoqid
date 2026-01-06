import type { BoxProps } from '@mui/material/Box';
import type { IUserProfileCover } from 'src/types/user';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ProfileCover({
   sx,
   name,
   username,
   role,
   coverUrl,
   avatarUrl,
   ...other
}: BoxProps & IUserProfileCover) {
   return (
      <Box
         sx={[
            (theme) => ({
               ...theme.mixins.bgGradient({
                  images: [
                     `linear-gradient(0deg, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.8)}, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.8)})`,
                     `url(${coverUrl})`,
                  ],
               }),
               height: 1,
               color: 'common.white',
            }),
            ...(Array.isArray(sx) ? sx : [sx]),
         ]}
         {...other}
      >
         <Box
            sx={{
               display: 'flex',
               left: { md: 24 },
               gap: 2,
               bottom: { md: 24 },
               zIndex: { md: 10 },
               pt: { xs: 6, md: 0 },
               position: { md: 'absolute' },
               flexDirection: { xs: 'column', md: 'row' },
            }}
         >
            <Avatar
               alt={name}
               src={avatarUrl}
               sx={[
                  (theme) => ({
                     mx: 'auto',
                     width: { xs: 64, md: 128 },
                     backgroundColor: 'grey.300',
                     height: { xs: 64, md: 128 },
                     border: `solid 2px ${theme.vars.palette.common.white}`,
                  }),
               ]}
            >
               {name?.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
               <Chip color="primary" variant='filled' size="small" label={role} sx={{display:'inline-flex'}} />
               <Typography typography="h4">{name}</Typography>
               <Typography>@{username}</Typography>
            </Box>            
         </Box>
      </Box>
   );
}
