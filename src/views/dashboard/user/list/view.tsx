'use client';

import type { UserData } from 'src/stores/user';
import type { IUserTableFilters } from 'src/types/user';
import type { TableHeadCellProps } from 'src/components/table';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useDebounce, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import useRoleStore from 'src/stores/role';
import useAuthStore from 'src/stores/auth';
import useUserStore from 'src/stores/user';
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

import { UserCUForm } from '../forms/user-cu-form';
import { UserTableRow } from '../components/user-table-row';
import { UserTableToolbar } from '../components/user-table-toolbar';
import { UserTableFiltersResult } from '../components/user-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'name', label: 'Name' },
   { id: 'phoneNumber', label: 'Phone number' },
   { id: 'email', label: 'Email' },
   { id: 'role', label: 'Role', width: 180 },
   { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function UserListView() {
   const table = useTable();
   const confirmDialog = useBoolean();
   const addDialog = useBoolean();
   const { all, delete: destroy } = useUserStore();
   const { roles, all: getRoles } = useRoleStore();
   const { authData } = useAuthStore();

   const [tableData, setTableData] = useState<UserData[]>([]);
   const [rolesData, setRolesData] = useState<string[]>([]);
   const [loading, setLoading] = useState<boolean>(true);

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 1,
   });

   const filters = useSetState<IUserTableFilters>({ name: '', role: [], status: 'all' });
   const { state: currentFilters, setState: updateFilters } = filters;

   const fetchData = async () => {
      setLoading(true);

      const params = {
         page: table.page + 1,
         limit: table.rowsPerPage, // minimal 25
         sort: table.orderBy,
         order: table.order,
         search: currentFilters.name || '',
         role: currentFilters.role.join(',') || '',
      };

      const res = await all(params);

      if (res.success) {
         const { pagination: pgnt, users } = res.data;
         setTableData(users || []);
         setPagination({
            page: pgnt.page,
            limit: pgnt.limit,
            total: pgnt.total,
            totalPages: pgnt.totalPages,
         });
      } else {
         toast.error('Gagal memuat data user');
      }

      setLoading(false);
   };


   useEffect(() => {
      getRoles();
   }, [getRoles]);

   useEffect(() => {
      if (roles && roles.length > 0) {
         const arrayStringRole = roles.map((r) => r.name);
         setRolesData(arrayStringRole);
      }
   }, [roles]);

   const [debouncedSearch] = useDebounce(currentFilters.name, 500);

   useEffect(() => {
      fetchData();
   }, [
      table.page,
      table.rowsPerPage,
      table.order,
      table.orderBy,
      debouncedSearch,
      currentFilters.role,
   ]);

   const dataFiltered = applyFilter({
      inputData: tableData,
      comparator: getComparator(table.order, table.orderBy),
      filters: currentFilters,
   });

   const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

   const canReset =
      !!currentFilters.name || currentFilters.role.length > 0 || currentFilters.status !== 'all';

   const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

   const handleDeleteRow = useCallback(
      async (id: string) => {

         if (id === authData.userId) { toast.info("Tidak dapat menghapus diri sendiri!"); return }
         try {
            const reqdel = await destroy({ id });
            if (reqdel.success) {
               toast.success(reqdel.message);
            }
         } catch (error: any) {
            toast.error("Gagal menghapus data");
         }
         fetchData();
         table.onUpdatePageDeleteRow(dataInPage.length);
      },
      [dataInPage.length, table, tableData]
   );

   const handleDeleteRows = useCallback(async () => {
      if (table.selected.length === 0) {
         toast.info("Tidak ada data yang dipilih!");
         return;
      }

      // Cegah pengguna menghapus dirinya sendiri
      const filteredIds = table.selected.filter((id) => id !== authData.userId);
      if (filteredIds.length < table.selected.length) {
         toast.info("Tidak dapat menghapus diri sendiri!");
      }

      try {
         // Loop hapus satu per satu
         for (const id of filteredIds) {
            try {
               const reqdel = await destroy({ id });
               if (reqdel.success) {
                  toast.success(reqdel.message || `Berhasil hapus user dengan ID: ${id}`);
               } else {
                  toast.error(reqdel.message || `Gagal hapus user dengan ID: ${id}`);
               }
            } catch (error) {
               toast.error(`Gagal hapus user dengan ID: ${id}`);
            }
         }

         fetchData();
         table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
      } catch (error) {
         toast.error("Terjadi kesalahan saat menghapus data!");
      }
   }, [authData.userId, table, dataInPage.length, dataFiltered.length]);


   // ----------------------------------------------------------------------------------------------------------
   const renderFormAdd = () => (
      <UserCUForm
         open={addDialog.value}
         onSuccess={() => fetchData()}
         onClose={addDialog.onFalse}
      />
   );

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
               heading="Users"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'User', href: paths.dashboard.user.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     onClick={addDialog.onTrue}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     Add user
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               <UserTableToolbar
                  filters={filters}
                  onResetPage={table.onResetPage}
                  options={{ roles: rolesData }}
               />

               {canReset && (
                  <UserTableFiltersResult
                     filters={filters}
                     totalResults={dataFiltered.length}
                     onResetPage={table.onResetPage}
                     sx={{ p: 2.5, pt: 0 }}
                  />
               )}

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
                                 <UserTableRow
                                    onSuccessEdit={() => fetchData()}
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id)}
                                    onSelectRow={() => table.onSelectRow(row.id)}
                                    onDeleteRow={() => handleDeleteRow(row.id)}
                                    editHref={paths.dashboard.user.edit(row.id)}
                                 />
                              ))}


                              {!loading && dataFiltered.length < 0 && (
                                 <TableEmptyRows
                                    height={table.dense ? 56 : 76}
                                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                                 />
                              )}

                              {pagination.totalPages === 0 && (
                                 <TableNoData notFound={notFound} />
                              )}

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
         </DashboardContent >

         {renderConfirmDialog()}
         {renderFormAdd()}
      </>
   );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
   inputData: UserData[];
   filters: IUserTableFilters;
   comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
   const { name, status, role } = filters;

   const stabilizedThis = inputData.map((el, index) => [el, index] as const);

   stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
   });

   inputData = stabilizedThis.map((el) => el[0]);

   if (name) {
      inputData = inputData.filter((user) => (user.name ?? '').toLowerCase().includes(name.toLowerCase()));
   }

   if (role.length) {
      inputData = inputData.filter((user) => role.includes(user.role ? user.role.name : ''));
   }

   return inputData;
}
