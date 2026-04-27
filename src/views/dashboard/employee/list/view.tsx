'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/al/paths';

import { useBoolean } from 'minimal-shared/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
   useTable,
   emptyRows,
   TableNoData,
   TableEmptyRows,
   TableHeadCustom,
   TablePaginationCustom,
} from 'src/components/table';

import useEmployeeStore from 'src/stores/employee';
import type { EmployeeData } from 'src/stores/employee';

import { toast } from 'src/components/snackbar';
import { useRouter } from 'src/routes/hooks';
import { EmployeeTableToolbar } from './employee-table-toolbar';
import { EmployeeTableRow } from './employee-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
   { id: 'user_id', label: 'Name' },
   { id: 'nik', label: 'NIK' },
   { id: 'nip', label: 'NIP' },
   { id: 'office_id', label: 'Office' },
   { id: 'company_id', label: 'Company' },
   { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function EmployeeListView() {
   const router = useRouter();
   const table = useTable({ defaultRowsPerPage: 10 });
   const { employees, loading, error, getAll, delete: deleteEmployee } = useEmployeeStore();

   const confirm = useBoolean();
   const [searchQuery, setSearchQuery] = useState('');

   useEffect(() => {
      getAll({ page: table.page + 1, limit: table.rowsPerPage, search: searchQuery });
   }, [table.page, table.rowsPerPage, searchQuery]);

   const handleEditRow = (id: string) => {
      router.push(paths.dashboard.employee.edit(id));
   };

   const handleDeleteRow = async (id: string) => {
      try {
         await deleteEmployee(id);
         toast.success('Employee deleted successfully');
      } catch (err) {
         toast.error('Failed to delete employee');
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="List Employees"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Employee', href: paths.dashboard.employee.root },
               { name: 'List' },
            ]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => router.push(paths.dashboard.employee.create)}
               >
                  New Employee
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <EmployeeTableToolbar
               searchQuery={searchQuery}
               onSearch={(val) => {
                  setSearchQuery(val);
                  table.onChangePage(null, 0);
               }}
            />

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
               <Scrollbar>
                  <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                     <TableHeadCustom
                        order={table.order}
                        orderBy={table.orderBy}
                        headCells={TABLE_HEAD}
                        onSort={table.onSort}
                     />

                     <TableBody>
                        {employees.map((row: EmployeeData) => (
                           <EmployeeTableRow
                              key={row.id}
                              row={row}
                              onEditRow={() => handleEditRow(row.id)}
                              onDeleteRow={() => handleDeleteRow(row.id)}
                           />
                        ))}

                        <TableEmptyRows
                           height={60}
                           emptyRows={emptyRows(table.page, table.rowsPerPage, employees.length)}
                        />

                        <TableNoData notFound={!loading && employees.length === 0} />
                     </TableBody>
                  </Table>
               </Scrollbar>
            </TableContainer>

            <TablePaginationCustom
               page={table.page}
               dense={table.dense}
               count={employees.length} // Should be total from API in real implementation
               rowsPerPage={table.rowsPerPage}
               onPageChange={table.onChangePage}
               onRowsPerPageChange={table.onChangeRowsPerPage}
               onChangeDense={table.onChangeDense}
            />
         </Card>
      </DashboardContent>
   );
}
