'use client';

import type { ShiftData } from 'src/stores/shift';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from 'sonner';

import { Iconify } from 'src/components/iconify';
import useShiftStore from 'src/stores/shift';
import { fShiftDate } from 'src/utils/format-shift-date';

// ----------------------------------------------------------------------

interface ShiftSwitchDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shiftA: ShiftData | null; // Shift yang diklik (pre-set)
  allShifts: ShiftData[];   // Semua shift bulan ini untuk pilih shiftB
}

export function ShiftSwitchDialog({
  open,
  onClose,
  onSuccess,
  shiftA,
  allShifts,
}: ShiftSwitchDialogProps) {
  const { switchShifts } = useShiftStore();
  const [shiftAId, setShiftAId] = useState('');
  const [shiftBId, setShiftBId] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset saat dialog dibuka
  useEffect(() => {
    if (open) {
      setShiftAId(shiftA?.id || '');
      setShiftBId('');
    }
  }, [open, shiftA]);

  // Opsi shiftA & shiftB
  const selectedShiftA = allShifts.find((s) => s.id === shiftAId) ?? null;
  const selectedShiftB = allShifts.find((s) => s.id === shiftBId) ?? null;

  const shiftAOptions = allShifts;
  const shiftBOptions = allShifts.filter((s) => s.id !== shiftAId);

  const handleSwitch = async () => {
    if (!shiftAId || !shiftBId) {
      toast.error('Pilih kedua shift terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const res = await switchShifts(shiftAId, shiftBId);
      if (res?.success) {
        toast.success('Shift berhasil ditukar!');
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const ShiftCard = ({ shift, label }: { shift: ShiftData | null; label: string }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.neutral',
        flex: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
        {label}
      </Typography>
      {shift ? (
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            src={typeof shift.user === 'object' && shift.user ? (shift.user as any).image : undefined}
            sx={{ width: 36, height: 36 }}
          />
          <Box>
            <Typography variant="subtitle2" noWrap>
              {typeof shift.user === 'object' && shift.user
                ? (shift.user as any).name ?? 'Unknown'
                : 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fShiftDate(shift.date)} · {shift.start_time}–{shift.end_time}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Belum dipilih
        </Typography>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tukar Shift</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Alert severity="info" icon={<Iconify icon="solar:transfer-horizontal-bold-duotone" />}>
            Tukar jadwal karyawan antar shift. Boleh lintas tanggal.
          </Alert>

          {/* Preview dua shift */}
          <Stack direction="row" spacing={1.5} alignItems="stretch">
            <ShiftCard shift={selectedShiftA} label="Shift A (Sumber)" />

            <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5 }}>
              <Iconify icon="solar:transfer-horizontal-bold" width={24} color="text.disabled" />
            </Box>

            <ShiftCard shift={selectedShiftB} label="Shift B (Tujuan)" />
          </Stack>

          {/* Pilih Shift A (Hanya jika belum ada shiftA awal) */}
          {!shiftA && (
            <TextField
              select
              label="Pilih Shift A (Sumber)"
              value={shiftAId}
              onChange={(e) => {
                setShiftAId(e.target.value);
                if (e.target.value === shiftBId) setShiftBId('');
              }}
              fullWidth
              required
            >
              {shiftAOptions.map((s) => {
                const userName =
                  typeof s.user === 'object' && s.user
                    ? (s.user as any).name ?? 'Unknown'
                    : 'Unknown';
                return (
                  <MenuItem key={s.id} value={s.id}>
                    {`${fShiftDate(s.date, false)} · ${s.start_time}–${s.end_time} · ${userName}`}
                  </MenuItem>
                );
              })}
            </TextField>
          )}

          {/* Pilih Shift B */}
          <TextField
            select
            label="Pilih Shift Tujuan"
            value={shiftBId}
            onChange={(e) => setShiftBId(e.target.value)}
            fullWidth
            required
          >
            {shiftBOptions.map((s) => {
              const userName =
                typeof s.user === 'object' && s.user
                  ? (s.user as any).name ?? 'Unknown'
                  : 'Unknown';
              return (
                <MenuItem key={s.id} value={s.id}>
                  {`${fShiftDate(s.date, false)} · ${s.start_time}–${s.end_time} · ${userName}`}
                </MenuItem>
              );
            })}
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSwitch}
          disabled={loading || !shiftBId}
          startIcon={loading ? <CircularProgress size={16} /> : <Iconify icon="solar:transfer-horizontal-bold" />}
        >
          Tukar Shift
        </Button>
      </DialogActions>
    </Dialog>
  );
}
