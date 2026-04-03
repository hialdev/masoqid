'use client';

import type { ShiftData } from 'src/stores/shift';
import type { OfficeData } from 'src/stores/office';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/al/paths';

import useShiftStore from 'src/stores/shift';
import useOfficeStore from 'src/stores/office';

import { OfficeSelector } from './components/office-selector';
import { ShiftDayCell } from './components/shift-day-cell';
import { ShiftFormDialog } from './components/shift-form-dialog';
import { ShiftSwitchDialog } from './components/shift-switch-dialog';

// ----------------------------------------------------------------------

const WEEK_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDay);
  const remainingDays = 6 - endDate.getDay();
  endDate.setDate(endDate.getDate() + remainingDays);

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ----------------------------------------------------------------------

export function ShiftCalendarView() {
  const { shifts, getMonthlySchedule, deleteShift } = useShiftStore();
  const { offices, getAll: getOffices } = useOfficeStore();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [loading, setLoading] = useState(false);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeData | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
  const [defaultDate, setDefaultDate] = useState('');

  const monthKey = formatMonthKey(year, month);
  const days = getMonthGrid(year, month);

  // Fetch offices on mount
  useEffect(() => {
    setOfficesLoading(true);
    getOffices({ limit: 100 }).finally(() => setOfficesLoading(false));
  }, [getOffices]);

  const fetchShifts = useCallback(async () => {
    if (!selectedOffice) return;
    setLoading(true);
    try {
      await getMonthlySchedule({ month: monthKey, office_id: selectedOffice.id });
    } finally {
      setLoading(false);
    }
  }, [monthKey, getMonthlySchedule, selectedOffice]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Navigasi bulan
  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const handleToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Group shifts by date
  const shiftsByDate: Record<string, ShiftData[]> = {};
  shifts.forEach((s) => {
    const key = s.date.slice(0, 10);
    if (!shiftsByDate[key]) shiftsByDate[key] = [];
    shiftsByDate[key].push(s);
  });

  // Handlers
  const handleAddShift = (date: string) => {
    setSelectedShift(null);
    setDefaultDate(date);
    setFormOpen(true);
  };

  const handleEditShift = (shift: ShiftData) => {
    setSelectedShift(shift);
    setDefaultDate('');
    setFormOpen(true);
  };

  const handleSwitchShift = (shift: ShiftData) => {
    setSelectedShift(shift);
    setSwitchOpen(true);
  };

  const handleDeleteShift = (shift: ShiftData) => {
    setSelectedShift(shift);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedShift) return;
    await deleteShift(selectedShift.id);
    setDeleteOpen(false);
    fetchShifts();
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Shift Calendar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Shift Management', href: paths.dashboard.shift.root },
          { name: 'Calendar' },
        ]}
        action={
          selectedOffice && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
              onClick={() => handleAddShift(formatDateKey(new Date()))}
            >
              Tambah Shift
            </Button>
          )
        }
        sx={{ mb: 3 }}
      />

      {/* Office Selector */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
        Pilih Office
      </Typography>
      <OfficeSelector
        offices={offices}
        selected={selectedOffice}
        onSelect={(office) => {
          setSelectedOffice(office);
        }}
        loading={officesLoading}
      />

      {/* Kalender — hanya tampil jika office dipilih */}
      {!selectedOffice ? (
        <Box
          sx={{
            p: 5,
            borderRadius: 2,
            bgcolor: 'background.neutral',
            textAlign: 'center',
          }}
        >
          <Iconify icon="solar:calendar-bold-duotone" width={60} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Pilih office terlebih dahulu
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Kalender shift akan ditampilkan setelah Anda memilih office di atas
          </Typography>
        </Box>
      ) : (
        <Card sx={{ p: 2 }}>
          {/* Header navigasi bulan */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={handlePrevMonth}>
                <Iconify icon="solar:alt-arrow-left-bold" />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                {MONTH_NAMES[month]} {year}
              </Typography>
              <IconButton onClick={handleNextMonth}>
                <Iconify icon="solar:alt-arrow-right-bold" />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1}>
              {loading && <CircularProgress size={20} />}
              <Button size="small" variant="outlined" onClick={handleToday}>
                Hari Ini
              </Button>
            </Stack>
          </Stack>

          {/* Header hari */}
          <Grid container columns={7} sx={{ mb: 0.5 }}>
            {WEEK_DAYS.map((d) => (
              <Grid key={d} size={1}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  align="center"
                  display="block"
                  color="text.secondary"
                  sx={{ py: 0.5 }}
                >
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Grid kalender */}
          <Grid container columns={7} spacing={0.5}>
            {days.map((date) => {
              const key = formatDateKey(date);
              const dayShifts = shiftsByDate[key] ?? [];
              const isCurrentMonth = date.getMonth() === month;

              return (
                <Grid key={key} size={1}>
                  <ShiftDayCell
                    date={date}
                    shifts={dayShifts}
                    isCurrentMonth={isCurrentMonth}
                    onAdd={handleAddShift}
                    onEdit={handleEditShift}
                    onDelete={handleDeleteShift}
                    onSwitch={handleSwitchShift}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Card>
      )}

      {/* Dialog Tambah/Edit — hanya render jika office dipilih */}
      {selectedOffice && (
        <ShiftFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={fetchShifts}
          officeId={selectedOffice.id}
          editData={selectedShift}
          defaultDate={defaultDate}
        />
      )}

      {/* Dialog Switch */}
      <ShiftSwitchDialog
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onSuccess={fetchShifts}
        shiftA={selectedShift}
        allShifts={shifts}
      />

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hapus Shift</DialogTitle>
        <DialogContent>
          <Typography>
            Yakin ingin menghapus shift ini? Tindakan tidak dapat dibatalkan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
