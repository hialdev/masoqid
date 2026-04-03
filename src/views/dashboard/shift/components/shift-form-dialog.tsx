'use client';

import type { ShiftData, ShiftInput } from 'src/stores/shift';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { toast } from 'sonner';

import useShiftStore from 'src/stores/shift';
import useOfficeStore from 'src/stores/office';

// ----------------------------------------------------------------------

interface ShiftFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  officeId: string;            // wajib — karyawan diambil dari office ini
  editData?: ShiftData | null;
  defaultDate?: string;        // \"YYYY-MM-DD\" — pre-fill dari klik sel kalender
}

export function ShiftFormDialog({
  open,
  onClose,
  onSuccess,
  officeId,
  editData,
  defaultDate,
}: Readonly<ShiftFormDialogProps>) {
  const { createShift, updateShift } = useShiftStore();
  const { getOfficeUsers } = useOfficeStore();

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState<ShiftInput>({
    user_id: '',
    office_id: officeId,
    date: defaultDate || '',
    start_time: '08:00',
    end_time: '17:00',
    note: '',
  });

  const isEdit = Boolean(editData);

  // Fetch employees dari office yang dipilih
  useEffect(() => {
    if (open && officeId) {
      setUsersLoading(true);
      getOfficeUsers(officeId)
        .then((users: any[]) => {
          setUserOptions(
            (users ?? []).map((u: any) => ({ id: u.id, name: u.name ?? u.username ?? 'Unknown' }))
          );
        })
        .catch(() => setUserOptions([]))
        .finally(() => setUsersLoading(false));
    }
  }, [open, officeId, getOfficeUsers]);

  // Pre-fill saat edit
  useEffect(() => {
    if (editData) {
      setForm({
        user_id: editData.user_id,
        office_id: officeId,
        date: editData.date,
        start_time: editData.start_time,
        end_time: editData.end_time,
        note: editData.note ?? '',
      });
    } else {
      setForm({
        user_id: '',
        office_id: officeId,
        date: defaultDate || '',
        start_time: '08:00',
        end_time: '17:00',
        note: '',
      });
    }
  }, [editData, defaultDate, open, officeId]);

  const handleChange = (field: keyof ShiftInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.user_id || !form.date || !form.start_time || !form.end_time) {
      toast.error('Harap lengkapi semua field yang wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const payload: ShiftInput = { ...form, office_id: officeId };
      const res = isEdit
        ? await updateShift(editData!.id, payload)
        : await createShift(payload);

      if (res?.success) {
        toast.success(isEdit ? 'Shift berhasil diperbarui' : 'Shift berhasil dibuat');
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Shift' : 'Tambah Shift'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            select
            label="Karyawan"
            value={form.user_id}
            onChange={(e) => handleChange('user_id', e.target.value)}
            fullWidth
            required
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: (val: unknown) => {
                  if (!val) return <Typography color="text.disabled">Pilih Karyawan</Typography>;
                  return userOptions.find((u) => u.id === val)?.name ?? String(val);
                },
              },
            }}
          >
            {usersLoading && (
              <MenuItem disabled>
                <CircularProgress size={14} sx={{ mr: 1 }} /> Memuat karyawan...
              </MenuItem>
            )}
            {!usersLoading && userOptions.length === 0 && (
              <MenuItem disabled>Tidak ada karyawan di office ini</MenuItem>
            )}
            {userOptions.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tanggal"
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            fullWidth
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Mulai Shift"
              type="time"
              value={form.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Selesai Shift"
              type="time"
              value={form.end_time}
              onChange={(e) => handleChange('end_time', e.target.value)}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <TextField
            label="Catatan (opsional)"
            value={form.note}
            onChange={(e) => handleChange('note', e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {isEdit ? 'Simpan Perubahan' : 'Buat Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
