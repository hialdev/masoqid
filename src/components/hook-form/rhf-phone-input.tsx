import type { PhoneInputProps } from '../phone-input';

import { Controller } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import { PhoneInput } from '../phone-input';

// ----------------------------------------------------------------------

export type RHFPhoneInputProps = Omit<PhoneInputProps, 'value' | 'onChange'> & {
   name: string;
};

export function RHFPhoneInput({ name, helperText, ...other }: RHFPhoneInputProps) {
   const { control, setValue } = useFormContext();

   return (
      <Controller
         name={name}
         control={control}
         render={({ field, fieldState: { error } }) => (
            <PhoneInput
               {...field}
               fullWidth
               error={!!error}
               helperText={error?.message ?? helperText}
               onChange={(val: any) => {
                  field.onChange(val.phone);

                  if (val.country) {
                     setValue(`${name}_country_code`, val.country);
                  }
               }}
               {...other}
            />
         )}
      />
   );
}
