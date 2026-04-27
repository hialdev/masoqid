'use client';

import type { OfficeData } from 'src/stores/office';
import type { TableHeadCellProps } from 'src/components/table';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import useOfficeStore from 'src/stores/office';
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

import { OfficeTableRow } from '../components/office-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'name', label: 'Office Name' },
   { id: 'company', label: 'Company', width: 160 },
   { id: 'address', label: 'Address' },
   { id: 'user_count', label: 'Employees', width: 120 },
   { id: 'is_strict_radius', label: 'Strict Radius', width: 140 },
   { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function OfficeListView() {
   const table = useTable();
   const router = useRouter();
   const confirmDialog = useBoolean();

   const { offices, loading, getAll, delete: destroy } = useOfficeStore();

   const [tableData, setTableData] = useState<OfficeData[]>([]);
   const [searchQuery, setSearchQuery] = useState('');

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
   });

   const fetchData = async () => {
      const params = {
         page: table.page + 1,
         limit: table.rowsPerPage,
         search: searchQuery,
      };

      await getAll(params);
   };

   useEffect(() => {
      if (offices) {
         setTableData(offices);
      }
   }, [offices]);

   const [debouncedSearch] = useDebounce(searchQuery, 500);

   useEffect(() => {
      fetchData();
   }, [table.page, table.rowsPerPage, debouncedSearch]);

   const dataFiltered = applyFilter({
      inputData: tableData,
      comparator: getComparator(table.order, table.orderBy),
      searchQuery,
   });

   const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

   const canReset = !!searchQuery;
   const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            const result = await destroy(id);
            if (result.success) {
               toast.success(result.message || 'Office deleted successfully');
               fetchData();
            }
         } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete office');
         }
         table.onUpdatePageDeleteRow(dataInPage.length);
      },
      [dataInPage.length, table, destroy]
   );

   const handleDeleteRows = useCallback(async () => {
      if (table.selected.length === 0) {
         toast.info('No offices selected!');
         return;
      }

      try {
         for (const id of table.selected) {
            try {
               const result = await destroy(id);
               if (result.success) {
                  toast.success(result.message || `Office deleted: ${id}`);
               }
            } catch (error) {
               toast.error(`Failed to delete office: ${id}`);
            }
         }

         fetchData();
         table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
      } catch (error) {
         toast.error('Error occurred while deleting offices!');
      }
   }, [table, dataInPage.length, dataFiltered.length, destroy]);

   const renderConfirmDialog = () => (
      <ConfirmDialog
         open={confirmDialog.value}
         onClose={confirmDialog.onFalse}
         title="Delete"
         content={
            <>
               Are you sure want to delete <strong> {table.selected.length} </strong> offices?
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
               heading="Offices"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Office', href: paths.dashboard.office.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     onClick={() => router.push(paths.dashboard.office.create)}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     Add Office
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               {/* Search Toolbar */}
               <Box sx={{ p: 2.5 }}>
                  <TextField
                     fullWidth
                     value={searchQuery}
                     onChange={(e) => {
                        setSearchQuery(e.target.value);
                        table.onResetPage();
                     }}
                     placeholder="Search offices..."
                     InputProps={{
                        startAdornment: (
                           <InputAdornment position="start">
                              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                           </InputAdornment>
                        ),
                     }}
                  />
               </Box>

               {loading ? (
                  <LoadingScreen />
               ) : (
                  <Box sx={{ position: 'relative' }}>
                     <TableSelectedAction
                        dense={table.dense}
                        numSelected={table.selected.length}
                        rowCount={dataFiltered.length}
                        onSelectAllRows={(checked) =>
                           table.onSelectAllRows(
                              checked,
                              dataFiltered.map((row) => row.id)
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
                                    dataFiltered.map((row) => row.id)
                                 )
                              }
                           />

                           <TableBody>
                              {dataFiltered.map((row) => (
                                 <OfficeTableRow
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id)}
                                    onSelectRow={() => table.onSelectRow(row.id)}
                                    onDeleteRow={() => handleDeleteRow(row.id)}
                                    onSuccess={() => fetchData()}
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

                              {dataFiltered.length === 0 && <TableNoData notFound={notFound} />}
                           </TableBody>
                        </Table>
                     </Scrollbar>
                  </Box>
               )}

               <TablePaginationCustom
                  page={table.page}
                  dense={table.dense}
                  count={pagination.total}
                  rowsPerPage={table.rowsPerPage}
                  onPageChange={table.onChangePage}
                  onRowsPerPageChange={table.onChangeRowsPerPage}
                  onChangeDense={table.onChangeDense}
               />
            </Card>
         </DashboardContent>

         {renderConfirmDialog()}
      </>
   );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
   inputData: OfficeData[];
   searchQuery: string;
   comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, searchQuery }: ApplyFilterProps) {
   const stabilizedThis = inputData.map((el, index) => [el, index] as const);

   stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
   });

   inputData = stabilizedThis.map((el) => el[0]);

   if (searchQuery) {
      inputData = inputData.filter(
         (office) =>
            office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            office.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
   }

   return inputData;
}
