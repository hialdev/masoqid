import { useState, useEffect } from 'react';

import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LoadingButton from '@mui/lab/LoadingButton';

import useUserStore from 'src/stores/user';
import useRoleStore from 'src/stores/role';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
};

export function CompanyUserModal({ open, onClose, onSuccess }: Props) {
  const { add } = useUserStore();
  const { all: getRoles } = useRoleStore();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
  });

  useEffect(() => {
    if (open) {
      getRoles().then((res) => {
        if (res.success) setRoles(res.data || []);
      });
    }
  }, [open, getRoles]);

  const ownerRole = roles.find((r) => r.name === 'Company Owner');

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.username) {
       toast.error('Harap isi field yang wajib');
       return;
    }

    if (!ownerRole) {
      toast.error('Role Company Owner tidak ditemukan');
      return;
    }

    setLoading(true);
    try {
      const res = await add({
        ...form,
        role_id: ownerRole.id,
      } as any);
      
      if (res.success) {
        toast.success('User berhasil dibuat');
        onSuccess(res.data);
        onClose();
        setForm({ name: '', email: '', phone: '', username: '' });
      } else {
        toast.error(res.message || 'Gagal membuat user');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Tambah Company Owner</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nama Lengkap"
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <TextField
            label="Username"
            fullWidth
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <TextField
            label="Email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <TextField
            label="Nomor Telepon"
            fullWidth
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextField
            label="Role"
            fullWidth
            disabled
            value="Company Owner"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Batal</Button>
        <LoadingButton
          variant="contained"
          onClick={handleSubmit}
          loading={loading}
        >
          Simpan User
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
