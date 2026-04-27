'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/routes/al/paths';

import useSalaryStore from 'src/stores/salary';
import useOfficeStore from 'src/stores/office';

// ----------------------------------------------------------------------

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ----------------------------------------------------------------------

export function SalaryReportView() {
  const { report, getSalaryReport, exportSalaryReport } = useSalaryStore();
  const { getAll: getOffices } = useOfficeStore();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [officeIds, setOfficeIds] = useState<string[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  useEffect(() => {
    getOffices({ limit: 100 }).then(setOffices);
  }, [getOffices]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      await getSalaryReport({ month, office_ids: officeIds.join(',') });
    } finally {
      setLoading(false);
    }
  }, [month, officeIds, getSalaryReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    try {
      await exportSalaryReport({ month, format, office_ids: officeIds.join(',') });
    } finally {
      setExporting(null);
    }
  };

  const totalSalary = report.reduce((sum, r) => sum + r.total_salary, 0);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Laporan Gaji"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Salary', href: paths.dashboard.salary.root },
          { name: 'Report' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={
                exporting === 'csv'
                  ? <CircularProgress size={16} />
                  : <Iconify icon="solar:file-text-bold-duotone" />
              }
              onClick={() => handleExport('csv')}
              disabled={exporting !== null || report.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={
                exporting === 'xlsx'
                  ? <CircularProgress size={16} />
                  : <Iconify icon="solar:file-bold-duotone" />
              }
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null || report.length === 0}
            >
              Export Excel
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      {/* Summary cards */}
      <Stack direction="row" spacing={2} mb={3}>
        <Card sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Total Karyawan</Typography>
          <Typography variant="h4" color="primary.main">{report.length}</Typography>
        </Card>
        <Card sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Total Pengeluaran Gaji</Typography>
          <Typography variant="h4" color="success.main">{formatRupiah(totalSalary)}</Typography>
        </Card>
        <Card sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Rata-rata Hari Masuk</Typography>
          <Typography variant="h4">
            {report.length > 0
              ? Math.round(report.reduce((sum, r) => sum + r.work_days, 0) / report.length)
              : 0}{' '}hari
          </Typography>
        </Card>
      </Stack>

      <Card>
        {/* Filter */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2 }}>
          <TextField
            label="Periode"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 200 }}
          />
 
          <Autocomplete
            multiple
            size="small"
            options={offices}
            getOptionLabel={(option) => option.name}
            value={offices.filter((option) => officeIds.includes(option.id))}
            onChange={(_, newValue) => setOfficeIds(newValue.map((v) => v.id))}
            renderInput={(params) => <TextField {...params} label="Pilih Office" />}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox key={option.id} size="small" checked={selected} />
                {option.name}
              </li>
            )}
            sx={{ width: 300 }}
            disableCloseOnSelect
          />
 
          {loading && <CircularProgress size={20} />}
        </Stack>

        <TableContainer>
          <Scrollbar>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Nama Karyawan</TableCell>
                  <TableCell align="right">Gaji/Hari</TableCell>
                  <TableCell align="right">Gaji/Jam</TableCell>
                  <TableCell align="center">Hari Masuk</TableCell>
                  <TableCell align="right">Total Gaji</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.map((row, index) => (
                  <TableRow key={row.user_id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatRupiah(row.daily_salary)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatRupiah(row.hourly_salary)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: row.work_days > 0 ? 'success.lighter' : 'background.neutral',
                          color: row.work_days > 0 ? 'success.darker' : 'text.disabled',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {row.work_days}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {formatRupiah(row.total_salary)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row */}
                {report.length > 0 && (
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700 }}>
                      TOTAL
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                        {formatRupiah(totalSalary)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {report.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Tidak ada data gaji untuk periode ini
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
