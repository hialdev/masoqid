"use client";

import type { SettingData } from "src/stores/setting";

import * as z from "zod";
import { useMemo, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Radio from "@mui/material/Radio";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RadioGroup from "@mui/material/RadioGroup";
import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";

import useSettingStore from "src/stores/setting";

import { toast } from "src/components/snackbar";
import { Form, Field } from "src/components/hook-form";
import { useRouter } from "src/routes/hooks";

// 🔹 Schema validasi
export const SettingSchema = z.object({
   name: z.string().min(1, "Name is required"),
   description: z.string().optional(),
   set_key: z.string().min(1, "Key is required"),
   set_value: z.string().nullable().optional(),
   set_type: z.enum([
      "text",
      "number",
      "checkbox",
      "radio",
      "select",
      "selects",
      "file",
      "image",
      "files",
      "images",
      "richtext",
      "markdown",
   ]),
   set_options: z.string().optional(),
   is_urgent: z.boolean(),
   group_id: z.string().uuid("Group ID must be UUID"),
});

export type SettingFormValues = z.infer<typeof SettingSchema>;

type Props = {
   defaultValues?: Partial<SettingFormValues>;
   onSubmit?: (values: SettingFormValues) => Promise<void>;
   onRequestFinished?: (success: boolean) => void;
};

export default function CUSettingForm({
   defaultValues,
   onSubmit,
   onRequestFinished,
}: Props) {
   const { tabs, all, add } = useSettingStore();
   const [previewSelectsValue, setPreviewSelectsValue] = useState<string[]>([]);

   const router = useRouter();

   const methods = useForm<SettingFormValues>({
      resolver: zodResolver(SettingSchema),
      defaultValues: {
         name: "",
         description: "",
         set_key: "",
         set_value: "",
         set_type: "text",
         set_options: "",
         is_urgent: false,
         group_id: "",
         ...defaultValues,
      },
   });

   const {
      watch,
      control,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const setType = watch("set_type");
   const setOptionsRaw = watch("set_options");

   const handleFormSubmit = handleSubmit(async (data: SettingFormValues) => {
      try {
         const storing = await add({ data: data as SettingData });

         if (storing.success) {
            toast.success(storing.message);
            onRequestFinished?.(true);
            router.refresh()
         } else {
            toast.error(storing.message);
            onRequestFinished?.(false);
         }
      } catch (err) {
         toast.error("Failed to save setting");
         onRequestFinished?.(false);
      }
   });

   useEffect(() => {
      all();
   }, []);

   // 🔹 Pecah options dari string menjadi array
   const parsedOptions = useMemo(
      () =>
         (setOptionsRaw || "")
            .split(",")
            .map((o) => o.trim())
            .filter((o) => o.length > 0),
      [setOptionsRaw]
   );

   return (
      <Form methods={methods} onSubmit={handleFormSubmit}>
         <Box
            sx={{
               rowGap: 2,
               columnGap: 2,
               display: "grid",
            }}
         >
            {/* Setting group */}
            <Field.Autocomplete
               name="group_id"
               label="Setting Group"
               autoHighlight
               options={tabs}
               getOptionLabel={(option) => option?.name ?? ""}
               isOptionEqualToValue={(option, value) => option.id === value}
               onChange={(_, value) => methods.setValue("group_id", value?.id || "")}
               value={tabs.find((tab) => tab.id === methods.watch("group_id")) || null}
            />

            <Field.Text name="name" label="Setting Name" />
            <Field.Text name="set_key" label="Key" />
            <Field.Text name="description" label="Description" multiline rows={2} />

            {/* Jenis field */}
            <Controller
               name="set_type"
               control={control}
               render={({ field }) => (
                  <TextField {...field} select label="Type" fullWidth>
                     {[
                        "text",
                        "number",
                        "checkbox",
                        "radio",
                        "select",
                        "selects",
                        "file",
                        "image",
                        "files",
                        "images",
                        "richtext",
                        "markdown",
                     ].map((opt) => (
                        <MenuItem key={opt} value={opt}>
                           {opt}
                        </MenuItem>
                     ))}
                  </TextField>
               )}
            />

            {/* 🔹 Field options hanya muncul jika select/selects/radio */}
            {(setType === "select" ||
               setType === "selects" ||
               setType === "radio") && (
                  <>
                     <Field.Text
                        name="set_options"
                        label="Options (comma separated)"
                        placeholder="contoh: option1, option2, option3"
                     />

                     {/* 🔹 Preview */}
                     {parsedOptions.length > 0 && (
                        <Box>
                           <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Preview
                           </Typography>

                           {setType === "select" && (
                              <Autocomplete
                                 options={parsedOptions}
                                 renderInput={(params) => (
                                    <TextField {...params} label="Select (preview)" />
                                 )}
                                 value={null}
                                 fullWidth
                              />
                           )}

                           {setType === "selects" && (
                              <Autocomplete
                                 id="preview-selects"
                                 multiple
                                 options={parsedOptions}
                                 value={previewSelectsValue} // ✅ gunakan state
                                 onChange={(_, newValue) => setPreviewSelectsValue(newValue)} // ✅ update saat select
                                 renderInput={(params) => (
                                    <TextField
                                       {...params}
                                       label="Selects (preview)"
                                       placeholder="Pilih beberapa opsi"
                                    />
                                 )}
                                 slotProps={{
                                    chip: {
                                       size: "small",
                                       variant: "soft",
                                    },
                                 }}
                                 fullWidth
                              />
                           )}

                           {setType === "radio" && (
                              <RadioGroup>
                                 {parsedOptions.map((opt) => (
                                    <FormControlLabel
                                       key={opt}
                                       value={opt}
                                       control={<Radio />}
                                       label={opt}
                                    />
                                 ))}
                              </RadioGroup>
                           )}
                        </Box>
                     )}
                  </>
               )}

            <Field.Checkbox name="is_urgent" label="Urgent?" />
         </Box>

         <Stack sx={{ mt: 3, alignItems: "flex-end" }}>
            <Button
               type="submit"
               variant="contained"
               loading={isSubmitting}
               loadingIndicator="Saving..."
            >
               Save Setting
            </Button>
         </Stack>
      </Form>
   );
}
