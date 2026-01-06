import { useState } from "react";

import { Box, Tab, Tabs } from "@mui/material";

import { Iconify } from "src/components/iconify";

import CUSettingForm from "./forms/cu-setting";
import CUSettingGroupForm from "./forms/cu-setting-group";

type Props = {
   onRequestFinished?: (success: boolean) => void;
};

export default function AddSetting({onRequestFinished} : Props) {
   const [activeTab, setActiveTab] = useState<string | number>(1);
   const tabs = [
      { id: 1, name: 'Setting', icon: '' },
      { id: 2, name: 'Setting Group', icon: '' },
   ]

   const handleRequestFinished = (success: boolean) => {
      console.log("Request selesai di child, status:", success);
      onRequestFinished?.(success);
   };

   return (
      <>
         {/* Tabs */}
         <Box sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
               {tabs.map((tab) => (
                  <Tab
                     iconPosition="start"
                     key={tab.id}
                     icon={<Iconify icon={tab.icon} width={20} height={20} />}
                     label={tab.name}
                     value={tab.id}
                  />
               ))}
            </Tabs>
         </Box>
         {activeTab === 1 ? (
            <CUSettingForm
               defaultValues={{}}
               onRequestFinished={handleRequestFinished} // ⬅️ kirim callback
            />
         ) : (
            <CUSettingGroupForm
               defaultValues={{}}
            />
         )}
      </>
   )
}