'use client';

import type { ShiftData } from 'src/stores/shift';
import type { OfficeData } from 'src/stores/office';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { toast } from 'sonner';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/routes/al/paths';

import useShiftStore from 'src/stores/shift';
import useOfficeStore from 'src/stores/office';
import { fShiftDate } from 'src/utils/format-shift-date';

import { OfficeSelector } from './components/office-selector';
import { ShiftFormDialog } from './components/shift-form-dialog';
import { ShiftSwitchDialog } from './components/shift-switch-dialog';

// ----------------------------------------------------------------------

export function ShiftManageView() {
  const { shifts, getAllShifts, deleteShift } = useShiftStore();
  const { offices, getAll: getOffices } = useOfficeStore();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeData | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);

  // Fetch offices on mount
  useEffect(() => {
    setOfficesLoading(true);
    getOffices({ limit: 100 }).finally(() => setOfficesLoading(false));
  }, [getOffices]);

  const fetchShifts = useCallback(async () => {
    if (!selectedOffice) return;
    const res = await getAllShifts({ page: page + 1, limit: rowsPerPage, month, office_id: selectedOffice.id });
    if (res?.data?.total !== undefined) setTotal(res.data.total);
  }, [getAllShifts, page, rowsPerPage, month, selectedOffice]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleEdit = (shift: ShiftData) => {
    setSelectedShift(shift);
    setFormOpen(true);
  };

  const handleSwitch = (shift: ShiftData) => {
    setSelectedShift(shift);
    setSwitchOpen(true);
  };

  const handleDelete = (shift: ShiftData) => {
    setSelectedShift(shift);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedShift) return;
    const res = await deleteShift(selectedShift.id);
    if (res?.success) {
      toast.success('Shift berhasil dihapus');
      setDeleteOpen(false);
      fetchShifts();
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Manage Shift"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Shift Management' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:calendar-bold-duotone" />}
              href={paths.dashboard.shift.calendar}
            >
              Kalender
            </Button>
            {selectedOffice && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                onClick={() => { setSelectedShift(null); setFormOpen(true); }}
              >
                Tambah Shift
              </Button>
            )}
          </Stack>
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
          setPage(0);
        }}
        loading={officesLoading}
      />

      {/* Tabel — hanya tampil jika office dipilih */}
      {!selectedOffice ? (
        <Box
          sx={{
            p: 5,
            borderRadius: 2,
            bgcolor: 'background.neutral',
            textAlign: 'center',
          }}
        >
          <Iconify icon="solar:buildings-2-bold-duotone" width={60} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Pilih office terlebih dahulu
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Daftar shift akan ditampilkan setelah Anda memilih office di atas
          </Typography>
        </Box>
      ) : (
        <Card>
          {/* Filter */}
          <Stack direction="row" spacing={2} sx={{ p: 2 }}>
            <TextField
              label="Filter Bulan"
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPage(0); }}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Karyawan</TableCell>
                    <TableCell>Tanggal</TableCell>
                    <TableCell>Mulai</TableCell>
                    <TableCell>Selesai</TableCell>
                    <TableCell>Catatan</TableCell>
                    <TableCell align="center">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((row) => {
                    const userName =
                      typeof row.user === 'object' && row.user
                        ? ((row.user as Record<string, unknown>).name as string) ?? 'Unknown'
                        : 'Unknown';
                    const userImage =
                      typeof row.user === 'object' && row.user
                        ? (row.user as Record<string, unknown>).image as string | undefined
                        : undefined;

                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={userImage} sx={{ width: 36, height: 36 }}>
                              {userName[0]}
                            </Avatar>
                            <Typography variant="body2">{userName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{fShiftDate(row.date)}</TableCell>
                        <TableCell>{row.start_time}</TableCell>
                        <TableCell>{row.end_time}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {row.note || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" justifyContent="center" spacing={0.5}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEdit(row)}>
                                <Iconify icon="solar:pen-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Tukar Shift">
                              <IconButton size="small" color="warning" onClick={() => handleSwitch(row)}>
                                <Iconify icon="solar:transfer-horizontal-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hapus">
                              <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {shifts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Tidak ada shift pada bulan ini</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[20]}
          />
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
        />
      )}

      <ShiftSwitchDialog
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onSuccess={fetchShifts}
        shiftA={selectedShift}
        allShifts={shifts}
      />

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Konfirmasi Hapus</DialogTitle>
        <DialogContent>
          <Typography>Yakin ingin menghapus shift ini?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Hapus</Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
