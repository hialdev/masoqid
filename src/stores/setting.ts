import { create } from "zustand";
import { persist } from "zustand/middleware";

import { protectedApi } from "../lib/al/axios";

export const inputTypes = [
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
];

export type InputTypesInterface = "textarea" | "text"
      | "number"
      | "checkbox"
      | "radio"
      | "select"
      | "selects"
      | "file"
      | "image"
      | "files"
      | "images"
      | "richtext"
      | "markdown";

export interface SettingData {
   id: string;
   name: string;
   description?: string;
   set_key: string;
   set_value?: any;
   set_type: InputTypesInterface;
   set_options?: any;
   is_urgent?: boolean;
   group_id?: string;
   created_at?: string;
   updated_at?: string;
}

export interface SettingGroupData {
   name: string;
   icon?: string;
   description?: string;
}

export interface Tab {
   id: string;
   icon: string;
   name: string;
   description: string;
   created_at: string;
   updated_at: string;
   settings: SettingData[];
}

interface SettingState {
   tabs: Tab[];

   getKey: (key:string) => Promise<any>;
   all: () => Promise<any>;
   addGroup: ({ data }: { data: SettingGroupData }) => Promise<any>;
   updateGroup: ({ id, data }: { id: string; data: SettingGroupData }) => Promise<any>;
   deleteGroup: ({ id }: { id: string }) => Promise<any>;
   
   detail: ({ id }: { id: string }) => Promise<any>;
   add: ({ data }: { data: SettingData }) => Promise<any>;
   update: ({ id, data }: { id: string; data: SettingData }) => Promise<any>;
   setValue: ({ id, value }: { id: string; value: any }) => Promise<any>;
   delete: ({ id }: { id: string }) => Promise<any>;
}

const useSettingStore = create<SettingState>()(
   persist(
      (set, get) => ({
         tabs: [],
         getKey: async (key:string) => {
            try {
               const response = await protectedApi.get("/settings/key/"+key);
               if (response.data.success){
                  return response.data.data;
               }else{
                  return undefined;
               }
            } catch (error) {
               return undefined;
            }
         },
         all: async () => {
            try {
               const response = await protectedApi.get("/setting-groups");
               if (response.data.success && response.data.data) {
                  set({ tabs: response.data.data });
               }
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         addGroup: async ({ data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(`/setting-groups/`, body);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         updateGroup: async ({ id, data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(
                  `/setting-groups/${id}`,
                  body
               );
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         deleteGroup: async ({ id }) => {
            try {
               const response = await protectedApi.delete(`/setting-groups/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },

         detail: async ({ id }) => {
            try {
               const response = await protectedApi.get(`/settings/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },

         add: async ({ data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(`/settings/`, body);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         update: async ({ id, data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(
                  `/settings/${id}`,
                  body
               );
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         setValue: async ({ id, value }) => {
            try {
               const formData = new FormData();

               if (
                  value instanceof File ||
                  (Array.isArray(value) && value.some((v) => v instanceof File))
               ) {
                  if (Array.isArray(value)) {
                     value.forEach((file) => {
                        if (file instanceof File) {
                           formData.append("set_value", file);
                        }
                     });
                  } else {
                     formData.append("set_value", value);
                  }

               } else {
                  formData.append("set_value", value);
               }

               const response = await protectedApi.post(
                  `/settings/${id}/value`,
                  formData,
                  {
                     headers: {
                        "Content-Type": "multipart/form-data", // ← biarkan kosong, atau hapus baris ini
                     },
                  }
               );

               return response.data;
            } catch (error: any) {
               return {
                  success: false,
                  message: error.response?.data?.message || error.message,
               };
            }
         },
         delete: async ({ id }) => {
            try {
               const response = await protectedApi.delete(`/settings/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
      }),
      {
         name: "setting-store", // key di localStorage
         partialize: (state) => ({
            tabs: state.tabs,
         }), // hanya simpan ini
      }
   )
);

export default useSettingStore;
