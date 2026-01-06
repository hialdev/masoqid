"use client"

import type { ButtonProps } from '@mui/material/Button';

import { useCallback } from 'react';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
   onClose?: () => void;
   showLabel?: boolean;
};

export function SignOutButton({ onClose, showLabel, sx, ...other }: Props) {
   const router = useRouter();

   const handleLogout = useCallback(async () => {
      try {
         // Panggil Route Handler logout
         const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include', // Kirim cookie ke backend
         });

         if (!res.ok) {
            throw new Error('Logout gagal di server');
         }

         // Tutup modal (jika ada)
         onClose?.();

         // Redirect ke halaman sign-in
         router.push(paths.auth.signIn);
      } catch (error) {
         console.error('Logout error:', error);
         toast.error('Unable to logout!');
      }
   }, [onClose, router]);

   return (
      <Button
         fullWidth
         variant="soft"
         size="large"
         color="error"
         onClick={handleLogout}
         sx={sx}
         endIcon={showLabel ? <Iconify icon="solar:login-3-bold-duotone" /> : <></>}
         {...other}
      >
         { showLabel ? 'Logout' : <Iconify icon="solar:login-3-bold-duotone" />}
      </Button>
   );
}