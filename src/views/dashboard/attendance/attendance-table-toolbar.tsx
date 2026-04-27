import { useCallback } from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// ----------------------------------------------------------------------

type Props = {
   filters: any;
   onFilters: (name: string, value: any) => void;
   //
   typeOptions: string[];
   statusOptions: string[];
   employeeOptions?: { id: string; name: string }[];
   officeOptions?: { id: string; name: string }[];
};

export default function AttendanceTableToolbar({
   filters,
   onFilters,
   //
   typeOptions,
   statusOptions,
   employeeOptions = [],
   officeOptions = [],
}: Props) {
   const handleFilterStartDate = useCallback(
      (newValue: any) => {
         onFilters('start_date', newValue);
      },
      [onFilters]
   );

   const handleFilterEndDate = useCallback(
      (newValue: any) => {
         onFilters('end_date', newValue);
      },
      [onFilters]
   );

   const handleFilterType = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         onFilters('type', event.target.value);
      },
      [onFilters]
   );

   const handleFilterStatus = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         onFilters('status', event.target.value);
      },
      [onFilters]
   );

   const handleFilterEmployees = useCallback(
      (event: any, newValue: { id: string; name: string }[]) => {
         onFilters('user_ids', newValue.map((item) => item.id).join(','));
      },
      [onFilters]
   );
   const handleFilterOffices = useCallback(
      (event: any, newValue: { id: string; name: string }[]) => {
         onFilters('office_ids', newValue.map((item) => item.id).join(','));
      },
      [onFilters]
   );
   return (
      <Stack
         spacing={2}
         alignItems={{ xs: 'flex-end', md: 'center' }}
         direction={{ xs: 'column', md: 'row' }}
         sx={{ p: 2.5 }}
      >
         <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            {officeOptions.length > 0 && (
               <Autocomplete
                  multiple
                  fullWidth
                  options={officeOptions}
                  getOptionLabel={(option) => option.name}
                  value={officeOptions.filter((option) =>
                     filters.office_ids?.split(',').includes(option.id)
                  )}
                  onChange={handleFilterOffices}
                  renderInput={(params) => <TextField {...params} label="Offices" />}
                  renderOption={(props, option, { selected }) => (
                     <li {...props} key={option.id}>
                        <Checkbox key={option.id} size="small" checked={selected} />
                        {option.name}
                     </li>
                  )}
                  limitTags={1}
                  disableCloseOnSelect
               />
            )}
            {employeeOptions.length > 0 && (
               <Autocomplete
                  multiple
                  fullWidth
                  options={employeeOptions}
                  getOptionLabel={(option) => option.name}
                  value={employeeOptions.filter((option) =>
                     filters.user_ids?.split(',').includes(option.id)
                  )}
                  onChange={handleFilterEmployees}
                  renderInput={(params) => <TextField {...params} label="Employees" />}
                  renderOption={(props, option, { selected }) => (
                     <li {...props} key={option.id}>
                        <Checkbox key={option.id} size="small" checked={selected} />
                        {option.name}
                     </li>
                  )}
                  limitTags={1}
                  disableCloseOnSelect
               />
            )}

            <DatePicker
               label="Start Date"
               value={filters.start_date}
               onChange={handleFilterStartDate}
               slotProps={{ textField: { fullWidth: true } }}
            />

            <DatePicker
               label="End Date"
               value={filters.end_date}
               onChange={handleFilterEndDate}
               slotProps={{ textField: { fullWidth: true } }}
            />

            <TextField
               fullWidth
               select
               label="Type"
               value={filters.type}
               onChange={handleFilterType}
               sx={{ textTransform: 'capitalize' }}
            >
               <MenuItem value="all">All</MenuItem>
               {typeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                     {option}
                  </MenuItem>
               ))}
            </TextField>

            <TextField
               fullWidth
               select
               label="Status"
               value={filters.status}
               onChange={handleFilterStatus}
               sx={{ textTransform: 'capitalize' }}
            >
               <MenuItem value="all">All</MenuItem>
               {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                     {option}
                  </MenuItem>
               ))}
            </TextField>
         </Stack>
      </Stack>
   );
}
