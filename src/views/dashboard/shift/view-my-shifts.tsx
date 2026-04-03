'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/al/paths';

import useShiftStore, { type ShiftData } from 'src/stores/shift';

// ----------------------------------------------------------------------

const WEEK_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ----------------------------------------------------------------------

function getBgColor(hasShift: boolean, isCurrentMonth: boolean): string {
  if (hasShift) return 'primary.lighter';
  return isCurrentMonth ? 'background.paper' : 'background.neutral';
}

export function MyShiftsView() {
  const { myShifts, getMyShifts } = useShiftStore();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      await getMyShifts({ month });
    } finally {
      setLoading(false);
    }
  }, [month, getMyShifts]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Group by date
  const shiftsByDate: Record<string, ShiftData[]> = {};
  myShifts.forEach((s) => {
    const key = s.date.slice(0, 10);
    if (!shiftsByDate[key]) shiftsByDate[key] = [];
    shiftsByDate[key].push(s);
  });

  // Kalender mini
  const [yr, mo] = month.split('-').map(Number);
  const firstDay = new Date(yr, mo - 1, 1);
  const lastDay = new Date(yr, mo, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Shift Saya"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Shift Saya' },
        ]}
        sx={{ mb: 3 }}
      />

      <Card sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            {MONTH_NAMES[mo - 1]} {yr}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {loading && <CircularProgress size={18} />}
            <TextField
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Stack>

        {/* Header hari */}
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5} mb={0.5}>
          {WEEK_DAYS.map((d) => (
            <Typography key={d} variant="caption" fontWeight={700} align="center" color="text.secondary" display="block">
              {d}
            </Typography>
          ))}
        </Box>

        {/* Grid */}
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
          {days.map((date) => {
            const key = formatDateKey(date);
            const dayShifts = shiftsByDate[key] ?? [];
            const isCurrentMonth = date.getMonth() === mo - 1;
            const isToday = key === formatDateKey(new Date());
            const hasShift = dayShifts.length > 0;

            return (
              <Box
                key={key}
                sx={{
                  minHeight: 70,
                  p: 0.75,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: hasShift ? 'primary.light' : 'divider',
                  bgcolor: getBgColor(hasShift, isCurrentMonth),
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isToday ? 'primary.main' : 'transparent',
                    color: isToday ? 'primary.contrastText' : 'text.primary',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption" fontWeight={isToday ? 700 : 400}>
                    {date.getDate()}
                  </Typography>
                </Box>

                {dayShifts.map((shift) => (
                  <Chip
                    key={shift.id}
                    icon={<Iconify icon="solar:clock-circle-bold" width={12} />}
                    label={`${shift.start_time}–${shift.end_time}`}
                    size="small"
                    color="primary"
                    sx={{ height: 20, fontSize: 10, mb: 0.25 }}
                  />
                ))}
              </Box>
            );
          })}
        </Box>

        {/* Summary */}
        <Stack direction="row" spacing={2} mt={2} pt={2} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Shift Bulan Ini</Typography>
            <Typography variant="h5" color="primary.main">{myShifts.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Hari dengan Shift</Typography>
            <Typography variant="h5">{Object.keys(shiftsByDate).length}</Typography>
          </Box>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
