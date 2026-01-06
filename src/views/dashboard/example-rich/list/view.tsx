'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/al/paths';

import useEventTypeStore from 'src/stores/example-rich';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
   useTable,
   emptyRows,
   rowInPage,
   TableNoData,
   getComparator,
   TableEmptyRows,
   TableHeadCustom,
   TableSelectedAction,
   TablePaginationCustom,
} from 'src/components/table';

import { Link } from '@mui/material';
import { redirect } from 'next/navigation';
import { ExampleRichTableFiltersResult } from '../components/example-rich-table-filters-result';
import { ExampleRichTableToolbar } from '../components/example-rich-table-toolbar';
import { ExampleRichTableRow } from '../components/example-rich-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
   { id: 'image', label: 'Image' },
   { id: 'title', label: 'Title' },
   { id: 'slug', label: 'Slug' },
   { id: 'description', label: 'Description' },
   { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function ExampleRichListView() {
   const table = useTable();
   const confirmDialog = useBoolean();
   const { all, delete: destroy } = useEventTypeStore();

   const [tableData, setTableData] = useState<any[]>([]);
   const [loading, setLoading] = useState<boolean>(true);

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 1,
   });

   const filters = useSetState<{ title: string }>({ title: '' });
   const { state: currentFilters, setState: updateFilters } = filters;

   const fetchData = async () => {
      setLoading(true);

      const params = {
         page: table.page + 1,
         limit: table.rowsPerPage,
         sort: table.orderBy,
         order: table.order,
         search: currentFilters.title || '',
      };

      try {
         const res = await all(params);

         if (res.success) {
            const { pagination: pgnt, event_types } = res.data;
            setTableData(event_types || []);
            setPagination({
               page: pgnt.page,
               limit: pgnt.limit,
               total: pgnt.total,
               totalPages: pgnt.totalPages,
            });
         } else {
            toast.error('Gagal memuat data event type');
         }
      } catch (error) {
         toast.error('Gagal memuat data event type');
         console.error('Error fetching Example Rich:', error);
      }

      setLoading(false);
   };

   useEffect(() => {
      fetchData();
   }, []);

   useEffect(() => {
      fetchData();
   }, [table.page, table.rowsPerPage, table.orderBy, table.order, currentFilters.title]);

   const applyFilter = (inputData: any[], comparator: (a: any, b: any) => number, filters: any) => {
      const { title } = filters;

      const stabilizedThis = inputData.map((el, index) => [el, index] as const);

      stabilizedThis.sort((a, b) => {
         const order = comparator(a[0], b[0]);
         if (order !== 0) return order;
         return a[1] - b[1];
      });

      inputData = stabilizedThis.map((el) => el[0]);

      if (title) {
         inputData = inputData.filter(
            (eventType) =>
               (eventType.title ?? '').toLowerCase().includes(title.toLowerCase()) ||
               (eventType.description ?? '').toLowerCase().includes(title.toLowerCase())
         );
      }

      return inputData;
   };

   const dataFiltered = applyFilter(
      tableData,
      getComparator(table.order, table.orderBy),
      currentFilters
   );

   const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

   const canReset = !!currentFilters.title;

   const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            const reqdel = await destroy({ id });
            if (reqdel.success) {
               toast.success(reqdel.message);
            }
         } catch (error: any) {
            toast.error('Gagal menghapus data');
         }
         fetchData();
         table.onUpdatePageDeleteRow(dataInPage.length);
      },
      [dataInPage.length, table, destroy, fetchData]
   );

   const handleDeleteRows = useCallback(async () => {
      if (table.selected.length === 0) {
         toast.info('Tidak ada data yang dipilih!');
         return;
      }

      try {
         // Loop hapus satu per satu
         for (const id of table.selected) {
            try {
               const reqdel = await destroy({ id });
               if (reqdel.success) {
                  toast.success(reqdel.message || `Berhasil hapus event type dengan ID: ${id}`);
               } else {
                  toast.error(reqdel.message || `Gagal hapus event type dengan ID: ${id}`);
               }
            } catch (error) {
               toast.error(`Gagal hapus event type dengan ID: ${id}`);
            }
         }

         fetchData();
         table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
      } catch (error) {
         toast.error('Terjadi kesalahan saat menghapus data!');
      }
   }, [table, dataInPage.length, dataFiltered.length, destroy, fetchData]);

   // ----------------------------------------------------------------------------------------------------------

   const renderConfirmDialog = () => (
      <ConfirmDialog
         open={confirmDialog.value}
         onClose={confirmDialog.onFalse}
         title="Delete"
         content={
            <>
               Are you sure want to delete <strong> {table.selected.length} </strong> items?
            </>
         }
         action={
            <Button
               variant="contained"
               color="error"
               onClick={() => {
                  handleDeleteRows();
                  confirmDialog.onFalse();
               }}
            >
               Delete
            </Button>
         }
      />
   );

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Example Rich"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Example Rich', href: paths.dashboard.example_rich.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     onClick={() => redirect(paths.dashboard.example_rich.create)}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     Add Event Type
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               <ExampleRichTableToolbar filters={filters} onResetPage={table.onResetPage} />

               {canReset && (
                  <ExampleRichTableFiltersResult
                     filters={filters}
                     totalResults={dataFiltered.length}
                     onResetPage={table.onResetPage}
                     sx={{ p: 2.5, pt: 0 }}
                  />
               )}

               {loading ? (
                  <LoadingScreen />
               ) : (
                  <Box sx={{ position: 'relative', pt: 2 }}>
                     <TableSelectedAction
                        dense={table.dense}
                        numSelected={table.selected.length}
                        rowCount={dataFiltered.length}
                        onSelectAllRows={(checked) =>
                           table.onSelectAllRows(
                              checked,
                              dataFiltered
                                 .map((row) => row.id)
                                 .filter((id): id is string => id !== undefined)
                           )
                        }
                        action={
                           <Tooltip title="Delete">
                              <IconButton color="primary" onClick={confirmDialog.onTrue}>
                                 <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                           </Tooltip>
                        }
                     />

                     <Scrollbar>
                        <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                           <TableHeadCustom
                              order={table.order}
                              orderBy={table.orderBy}
                              headCells={TABLE_HEAD}
                              rowCount={dataFiltered.length}
                              numSelected={table.selected.length}
                              onSort={table.onSort}
                              onSelectAllRows={(checked) =>
                                 table.onSelectAllRows(
                                    checked,
                                    dataFiltered
                                       .map((row) => row.id)
                                       .filter((id): id is string => id !== undefined)
                                 )
                              }
                           />

                           <TableBody>
                              {dataFiltered.map((row) => (
                                 <ExampleRichTableRow
                                    onSuccessEdit={() => fetchData()}
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id ? row.id : '')}
                                    onSelectRow={() => table.onSelectRow(row.id ? row.id : '')}
                                    onDeleteRow={() => handleDeleteRow(row.id ? row.id : '')}
                                    editHref={
                                       row.id ? paths.dashboard.example_rich.edit(row.id) : ''
                                    }
                                 />
                              ))}

                              {!loading && dataFiltered.length < 0 && (
                                 <TableEmptyRows
                                    height={table.dense ? 56 : 76}
                                    emptyRows={emptyRows(
                                       table.page,
                                       table.rowsPerPage,
                                       dataFiltered.length
                                    )}
                                 />
                              )}

                              {pagination.totalPages === 0 && <TableNoData notFound={notFound} />}
                           </TableBody>
                        </Table>
                     </Scrollbar>
                  </Box>
               )}

               <TablePaginationCustom
                  page={pagination.page - 1} // backend 1-based, MUI 0-based
                  dense={table.dense}
                  count={pagination.total}
                  rowsPerPage={pagination.limit}
                  onPageChange={(e, newPage) => {
                     table.onChangePage(e, newPage);
                     fetchData(); // ambil ulang data saat ganti halaman
                  }}
                  onRowsPerPageChange={(e) => {
                     const newLimit = parseInt(e.target.value, 10);
                     table.onChangeRowsPerPage(e as any);
                     setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 })); // reset ke page 1
                     table.onResetPage(); // pastikan ke halaman pertama
                     fetchData(); // ambil ulang data dengan limit baru
                  }}
                  onChangeDense={table.onChangeDense}
                  labelDisplayedRows={({ from, to }) =>
                     `${pagination.page} of ${pagination.totalPages} (${from}-${to} of ${pagination.total})`
                  }
               />
            </Card>
         </DashboardContent>

         {renderConfirmDialog()}
      </>
   );
}
