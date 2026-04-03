'use client';

import type { ShiftData } from 'src/stores/shift';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface ShiftDayCellProps {
  date: Date;
  shifts: ShiftData[];
  isCurrentMonth: boolean;
  onAdd: (date: string) => void;
  onEdit: (shift: ShiftData) => void;
  onDelete: (shift: ShiftData) => void;
  onSwitch: (shift: ShiftData) => void;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ShiftDayCell({
  date,
  shifts,
  isCurrentMonth,
  onAdd,
  onEdit,
  onDelete,
  onSwitch,
}: ShiftDayCellProps) {
  const isToday = formatDateKey(date) === formatDateKey(new Date());
  const dateKey = formatDateKey(date);

  return (
    <Box
      sx={{
        minHeight: 110,
        p: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: isCurrentMonth ? 'background.paper' : 'background.neutral',
        opacity: isCurrentMonth ? 1 : 0.5,
        position: 'relative',
        '&:hover .add-btn': { opacity: 1 },
      }}
    >
      {/* Nomor hari */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isToday ? 'primary.main' : 'transparent',
            color: isToday ? 'primary.contrastText' : 'text.primary',
          }}
        >
          <Typography variant="caption" fontWeight={isToday ? 700 : 400}>
            {date.getDate()}
          </Typography>
        </Box>

        {/* Tombol tambah shift */}
        {isCurrentMonth && (
          <IconButton
            className="add-btn"
            size="small"
            onClick={() => onAdd(dateKey)}
            sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'primary.main' }}
          >
            <Iconify icon="solar:add-circle-bold" width={18} />
          </IconButton>
        )}
      </Box>

      {/* List shift di hari ini */}
      <Stack spacing={0.5}>
        {shifts.map((shift) => {
          const userName =
            typeof shift.user === 'object' && shift.user
              ? (shift.user as any).name ?? 'Karyawan'
              : 'Karyawan';
          const userImage =
            typeof shift.user === 'object' && shift.user
              ? (shift.user as any).image
              : undefined;

          return (
            <Tooltip
              key={shift.id}
              title={
                <Stack spacing={0.5}>
                  <Typography variant="caption">{userName}</Typography>
                  <Typography variant="caption">
                    {shift.start_time} – {shift.end_time}
                  </Typography>
                  {shift.note && <Typography variant="caption">{shift.note}</Typography>}
                </Stack>
              }
              arrow
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  borderRadius: 0.75,
                  px: 0.75,
                  py: 0.25,
                  bgcolor: 'primary.lighter',
                  cursor: 'pointer',
                  '&:hover .shift-actions': { opacity: 1 },
                  position: 'relative',
                }}
              >
                <Avatar src={userImage} sx={{ width: 16, height: 16, fontSize: 8 }}>
                  {userName[0]}
                </Avatar>
                <Typography variant="caption" noWrap sx={{ flex: 1, color: 'primary.darker', fontSize: 10 }}>
                  {userName} · {shift.start_time}
                </Typography>

                {/* Action icons */}
                <Stack
                  className="shift-actions"
                  direction="row"
                  sx={{ opacity: 0, transition: 'opacity 0.15s', position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', bgcolor: 'primary.lighter' }}
                >
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(shift); }} sx={{ p: 0.25 }}>
                    <Iconify icon="solar:pen-bold" width={12} />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSwitch(shift); }} sx={{ p: 0.25 }}>
                    <Iconify icon="solar:transfer-horizontal-bold" width={12} />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(shift); }} sx={{ p: 0.25, color: 'error.main' }}>
                    <Iconify icon="solar:trash-bin-trash-bold" width={12} />
                  </IconButton>
                </Stack>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Badge jika shift > 3 */}
      {shifts.length > 3 && (
        <Chip
          label={`+${shifts.length - 3} lagi`}
          size="small"
          sx={{ mt: 0.5, height: 18, fontSize: 10 }}
        />
      )}
    </Box>
  );
}
