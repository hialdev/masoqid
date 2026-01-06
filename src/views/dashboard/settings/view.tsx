"use client";

import type { SettingData } from "src/stores/setting";

import * as z from "zod";
import { toast } from "sonner";
import { useBoolean } from "minimal-shared/hooks";
import { useMemo, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Button from "@mui/material/Button";
import {
   Card,
   Chip,
   Dialog,
   Typography,
   DialogContent,
} from "@mui/material";

import { paths } from "src/routes/al/paths";

import useSettingStore from "src/stores/setting";

import { Iconify } from "src/components/iconify";
import { ConfirmDialog } from "src/components/custom-dialog";
import { CustomBreadcrumbs } from "src/components/custom-breadcrumbs";

import AddSetting from "./components/add";
import RenderInput from "./components/render-type";

export default function SettingView() {
   const { all, tabs, setValue: fillSetting, delete: destroy, deleteGroup } = useSettingStore();
   const [activeTab, setActiveTab] = useState<string | number>("");
   const openAddDialog = useBoolean();
   const deleteDialog = useBoolean();
   const [selectedSetting, setSelectedSetting] = useState<SettingData>();

   // --- Ambil tab aktif ---
   const currentTab = useMemo(
      () => tabs.find((t) => t.id === activeTab),
      [activeTab, tabs]
   );

   // --- Generate default values berdasarkan tabs ---
   const defaultValues = useMemo(() => {
      const defaults: Record<string, any> = {};
      tabs.forEach((tab) => {
         tab.settings?.forEach((s) => {
            if (["images", "files", "image", "file"].includes(s.set_type)) {
               const fileValue = process.env.NEXT_PUBLIC_API_URL + '/' + s.set_value;
               if (["images", "files"].includes(s.set_type)) {
                  defaults[s.id] = Array.isArray(s.set_value) ? s.set_value : [];
               } else {
                  defaults[s.id] = fileValue ?? "";
               }
            } else {
               defaults[s.id] = s.set_value ?? "";
            }
         });
      });
      return defaults;
   }, [tabs]);

   const schema = useMemo(() => {
      const shape: Record<string, z.ZodType> = {};
      tabs.forEach((tab) => {
         tab.settings?.forEach((s) => {
            shape[s.id] = z.any();
         });
      });
      return z.object(shape);
   }, [tabs]);

   const methods = useForm({
      resolver: zodResolver(schema),
      defaultValues,
   });

   const handleRemoveFile = (fieldName: string, file: File) => {
      const currentValue = watch(fieldName);

      // kalau multiple (array)
      if (Array.isArray(currentValue)) {
         const newValue = currentValue.filter((item: File) => item !== file);
         setValue(fieldName, newValue, { shouldValidate: true });
      } else {
         // kalau single file
         setValue(fieldName, null, { shouldValidate: true });
      }
   };

   const { handleSubmit, watch, reset, setValue } = methods;

   const handleDeleteSetting = async () => {
      if (!selectedSetting) {
         toast.error("Tidak ada setting yang dipilih")
         return
      }
      const delSet = await destroy({id:selectedSetting.id})
      if (delSet.success){
         toast.success("Berhasil menghapus setting")
         all()
      }
   }

   const handleDeleteGroup = async (id:string) => {
      const delSet = await deleteGroup({id})
      if (delSet.success){
         toast.success("Berhasil menghapus group setting")
         all()
      }else{
         toast.error("Gagal menghapus group setting")
      }
   }
   // -------------------------------------------------------------------------------------------

   // --- Submit hanya tab aktif ---
   const onSubmit = handleSubmit(async (data) => {
      if (!currentTab) return;

      // Ambil hanya field milik tab aktif
      const tabSettings = currentTab.settings || [];
      const filteredData: Record<string, any> = {};

      tabSettings.forEach((s) => {
         filteredData[s.id] = data[s.id];
      });

      console.log("=== Submit Tab ===", currentTab.name);
      console.log("Data dikirim:", filteredData);

      // Filter only changed values
      const changedData = Object.entries(filteredData).reduce((acc, [id, newValue]) => {
         const currentSetting = currentTab.settings?.find(s => s.id === id);
         const oldValue = currentSetting?.set_value;
         const settingType = currentSetting?.set_type;

         if (["images", "files", "image", "file"].includes(settingType || '')) {
            // Case 1: jika multiple (array of files)
            if (Array.isArray(newValue)) {
               const hasNewFile = newValue.some((item: any) => item instanceof File);
               if (hasNewFile) acc[id] = newValue;
               return acc;
            }

            // Case 2: single file
            if (newValue instanceof File) {
               acc[id] = newValue; // file baru benar-benar diupload
               return acc;
            }

            // Case 3: string URL sama (tidak ada perubahan)
            const apiHost = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_HOST || '';
            if (typeof newValue === "string" && newValue.startsWith(apiHost) && oldValue && newValue.endsWith(oldValue)) {
               return acc; // sama, tidak ada perubahan
            }

            // Case 4: sama-sama kosong
            if (!newValue && !oldValue) return acc;
         } else {
            // Non-file setting: bandingkan string/number/boolean
            if (String(newValue ?? "") !== String(oldValue ?? "")) {
               acc[id] = newValue;
            }
         }

         return acc;
      }, {} as Record<string, any>);

      console.log("ChangedData", changedData);

      // If no changes, show message and return early
      if (Object.keys(changedData).length === 0) {
         toast.info('No changes detected');
         return;
      }

      const promises = Object.entries(changedData).map(([id, value]) =>
         fillSetting({ id, value })
            .catch(error => ({ error, id }))
      );

      const results = await Promise.all(promises);

      const failures = results.filter(r => 'error' in r);
      const successes = results.filter(r => !('error' in r));

      if (failures.length > 0) {
         toast.error(`Failed to save ${failures.length} setting(s)`);
      }

      if (successes.length > 0) {
         toast.success(`Successfully updated ${successes.length} setting(s)`);
      }

      all();
   });

   // -------------------------------------------------------------------------------------------

   // --- Load tabs awal ---
   useEffect(() => {
      all();
   }, [all]);

   // --- Set tab default ---
   useEffect(() => {
      if (tabs.length > 0 && !activeTab) {
         setActiveTab(tabs[0].id);
      }
   }, [tabs, activeTab]);

   useEffect(() => {
      if (tabs.length > 0) {
         const newDefaults: Record<string, any> = {};
         tabs.forEach((tab) => {
            tab.settings?.forEach((s) => {
               const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

               if (["images", "files"].includes(s.set_type)) {
                  let parsedValue = [];
                  try {
                     parsedValue = s.set_value ? JSON.parse(s.set_value) : [];
                     // Add API host to each item
                     parsedValue = parsedValue.map((item: string) => `${apiHost}/${item}`);
                  } catch (e) {
                     console.warn(`Failed to parse ${s.set_type} value for ${s.id}`);
                  }
                  newDefaults[s.id] = parsedValue;
               } else if (["image", "file"].includes(s.set_type)) {
                  newDefaults[s.id] = s.set_value ? `${apiHost}/${s.set_value}` : "";
               } else {
                  newDefaults[s.id] = s.set_value ?? "";
               }
            });
         });

         reset(newDefaults);
      }
   }, [tabs, reset]);

   // -------------------------------------------------------------------------------------------

   const renderConfirmDialog = () => (
      <ConfirmDialog
         open={deleteDialog.value}
         onClose={deleteDialog.onFalse}
         title="Delete Setting"
         content={
            <>
               Are you sure want to delete <strong> {selectedSetting?.name} </strong> setting?
            </>
         }
         action={
            <Button
               variant="contained"
               color="error"
               onClick={() => {
                  deleteDialog.onFalse();
                  setSelectedSetting(undefined);
                  handleDeleteSetting();
               }}
            >
               Delete
            </Button>
         }
      />
   );
   
   return (
      <>
         <CustomBreadcrumbs
            heading="Settings"
            links={[
               { name: "Dashboard", href: paths.dashboard.root },
               { name: "Settings" },
            ]}
            action={
               <Button
                  onClick={openAddDialog.onTrue}
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
               >
                  Add
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Dialog Add */}
         <Dialog fullWidth open={openAddDialog.value} onClose={openAddDialog.onFalse}>
            <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between" }}>
               <Typography variant="h5">Add Setting</Typography>
               <Button onClick={openAddDialog.onFalse} sx={{gap:1}} variant="outlined">
                  <Iconify icon="solar:close-circle-bold-duotone" /> Close
               </Button>
            </Box>
            <DialogContent sx={{mb:3}}>
               <AddSetting onRequestFinished={(success) => {openAddDialog.onFalse(); all()}} />
            </DialogContent>
         </Dialog>

         {renderConfirmDialog()}

         {/* Tabs */}
         <Box sx={{ mb: 3 }}>
            <Tabs value={activeTab || (tabs.length > 0 ? tabs[0].id : false)} onChange={(_, v) => setActiveTab(v)}>
               {tabs.map((tab) => (
                  <Tab
                     key={tab.id}
                     value={tab.id}
                     label={tab.name}
                     icon={<Iconify icon={tab.icon} width={20} height={20} />}
                     iconPosition="start"
                  />
               ))}
            </Tabs>
         </Box>

         {/* Form Dinamis */}
         <FormProvider {...methods}>
            <form onSubmit={onSubmit}>
               {currentTab && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                     <Box
                        sx={{
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "space-between",
                        }}
                     >
                        <Box>
                           <Typography variant="h6">All {currentTab.name} Settings</Typography>
                        </Box>
                        <Button onClick={() => handleDeleteGroup(currentTab.id)} variant="outlined" color="error">
                           <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                        </Button>
                     </Box>
                     
                     {currentTab.settings?.map((setting) => (
                        <Card key={setting.id} sx={{ p: 3 }}>
                           <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "space-between",
                                 mb: 2,
                              }}
                           >
                              <Box>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h6">{setting.name}</Typography>
                                    <Chip
                                       label={setting.set_key}
                                       icon={<Iconify icon="solar:key-minimalistic-bold-duotone" />}
                                    />
                                 </Box>
                                 <Typography variant="body2">{setting.description}</Typography>
                              </Box>
                              <Button variant="outlined" onClick={() => {setSelectedSetting(setting); deleteDialog.onTrue()}} color="error">
                                 <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                              </Button>
                           </Box>

                           <RenderInput setting={setting} handleRemoveFile={handleRemoveFile} />
                        </Card>
                     ))}

                     {/* Submit Button */}
                     <Box sx={{ position: "sticky", bottom: 0, py: 2 }}>
                        <Button
                           type="submit"
                           variant="contained"
                           fullWidth
                           startIcon={<Iconify icon="solar:diskette-bold-duotone" />}
                        >
                           Save {currentTab.name} Settings
                        </Button>
                     </Box>
                  </Box>
               )}
            </form>
         </FormProvider>
      </>
   );
}
