'use client';

import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { SimpleLayout } from 'src/layouts/simple';
import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function View403() {
   const router = useRouter();

   return (
      <SimpleLayout
         slotProps={{
            content: { compact: true },
         }}
      >
         <Container component={MotionContainer}>
            <m.div variants={varBounce('in')}>
               <Typography variant="h3" sx={{ mb: 2 }}>
                  No permission
               </Typography>
            </m.div>

            <m.div variants={varBounce('in')}>
               <Typography sx={{ color: 'text.secondary' }}>
                  The page you’re trying to access has restricted access. Please refer to your system
                  administrator.
               </Typography>
            </m.div>

            <m.div variants={varBounce('in')}>
               <ForbiddenIllustration sx={{ my: { xs: 5, sm: 10 } }} />
            </m.div>

            <Button onClick={router.back} size="large" variant="contained">
               Kembali
            </Button>
         </Container>
      </SimpleLayout>
   );
}
