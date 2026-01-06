import type { SettingData } from 'src/stores/setting';

import { useWatch } from 'react-hook-form';

import { Typography } from '@mui/material';

import { Field } from 'src/components/hook-form';

const RenderInput = ({
   setting,
   handleRemoveFile,
}: {
   setting: SettingData;
   handleRemoveFile: (fieldName: string, file: File) => void;
}) => {
   const { id: fieldName, set_type: type, name, set_options, set_value } = setting;

   const fieldValue = useWatch({ name: fieldName });

   const isMultiple = type === 'images' || type === 'files' || type === 'selects';

   // Convert comma-separated string → array of string
   const options: string[] =
      typeof set_options === 'string'
         ? set_options.split(',').map((i) => i.trim())
         : Array.isArray(set_options)
           ? set_options
           : [];

   const normalizeArray = (value: any): string[] => {
      if (Array.isArray(value)) {
         // Case spesial: ["yellow,red,purple"]
         if (value.length === 1 && typeof value[0] === 'string' && value[0].includes(',')) {
            return value[0].split(',').map((v) => v.trim());
         }
         return value;
      }

      if (typeof value === 'string') {
         try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
               if (parsed.length === 1 && parsed[0].includes(',')) {
                  return parsed[0].split(',').map((v: string) => v.trim());
               }
               return parsed;
            }
         } catch {
            return value.split(',').map((v) => v.trim());
         }
      }

      return [];
   };

   const initialArray = normalizeArray(set_value);
   console.log(initialArray);
   const currentArray = normalizeArray(fieldValue);

   switch (type) {
      case 'text':
         return <Field.Text type="text" name={fieldName} label={name} />;

      case 'number':
         return (
            <Field.Text
               name={fieldName}
               label={name}
               type="number"
               slotProps={{ inputLabel: { shrink: true } }}
            />
         );

      case 'select':
         return (
            <Field.Autocomplete
               name={fieldName}
               label={name}
               options={options}
               value={typeof fieldValue === 'string' ? fieldValue : set_value || null}
               isOptionEqualToValue={(option, value) => option === value}
               getOptionLabel={(option) => option || ''}
            />
         );

      case 'selects': {
         const valueArray = Array.isArray(fieldValue)
            ? fieldValue
            : initialArray;

         return (
            <Field.Autocomplete
               multiple
               name={fieldName}
               label={name}
               options={options}
               value={valueArray}
               isOptionEqualToValue={(option, value) => option === value}
               getOptionLabel={(option) => option || ''}
            />
         );
      }

      case 'image':
      case 'file':
      case 'images':
      case 'files': {
         const safeValue = isMultiple
            ? Array.isArray(fieldValue)
               ? fieldValue
               : []
            : fieldValue || '';

         return (
            <Field.Upload
               accept={{ '*': [] }}
               name={fieldName}
               multiple={isMultiple}
               maxSize={3145728}
               value={safeValue}
               onRemove={(file) => handleRemoveFile(fieldName, file as File)}
            />
         );
      }

      case 'richtext':
         return <Field.Editor name={fieldName} />;

      default:
         return <Typography>Unknown type: {type}</Typography>;
   }
};

export default RenderInput;
