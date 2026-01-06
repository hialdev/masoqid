"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import useSettingStore from "src/stores/setting";

import { toast } from "src/components/snackbar";
import { Form, Field } from "src/components/hook-form";
import { useRouter } from "src/routes/hooks";

export const SettingGroupSchema = z.object({
   name: z.string().min(1, "Name is required"),
   description: z.string().optional(),
   icon: z.string().optional(),
});

export type SettingGroupFormValues = z.infer<typeof SettingGroupSchema>;

type Props = {
   defaultValues?: Partial<SettingGroupFormValues>;
   onSubmit?: (values: SettingGroupFormValues) => Promise<void>;
};

export default function CUSettingGroupForm({ defaultValues, onSubmit }: Props) {

   const router = useRouter()
   const groupStore = useSettingStore();
   const { addGroup } = groupStore;

   const methods = useForm<SettingGroupFormValues>({
      resolver: zodResolver(SettingGroupSchema),
      defaultValues: {
         name: "",
         description: "",
         icon: "",
         ...defaultValues,
      },
   });

   const {
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const handleFormSubmit = handleSubmit(async (data) => {
      try {
         const add = await addGroup({data})
         if (add.success){
            toast.success("Setting group saved successfully!");
            router.refresh()
         }else{
            toast.error("Setting group failed to save! Error : "+add.message);
         }
      } catch (err) {
         toast.error("Failed to save setting group");
      }
   });

   return (
      <Form methods={methods} onSubmit={handleFormSubmit}>
         <Box
            sx={{
               rowGap: 2,
               columnGap: 2,
               display: "grid",
            }}
         >
            <Field.Text name="name" label="Group Name" />
            <Field.Text name="icon" label="Icon (optional)" />
            <Field.Text name="description" label="Description" multiline rows={3} />
         </Box>

         <Stack sx={{ mt: 3, alignItems: "flex-end" }}>
            <Button
               type="submit"
               variant="contained"
               loading={isSubmitting}
               loadingIndicator="Saving..."
            >
               Save Setting Group
            </Button>
         </Stack>
      </Form>
   );
}
