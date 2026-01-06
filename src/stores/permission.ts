import { create } from "zustand";
import { persist } from "zustand/middleware";

import { protectedApi } from "src/lib/al/axios";

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

export interface PermissionData {
   id?: string;
   name: string;
   description?: string;
   created_at?: string;
   updated_at?: string;
}

interface PermissionState {
   permissions: PermissionData[];

   all: () => Promise<any>;
   detail: ({ id }: { id: string }) => Promise<any>;
   add: ({ data }: { data: PermissionData }) => Promise<any>;
   update: ({ id, data }: { id: string; data: PermissionData }) => Promise<any>;
   setValue: ({ id, value }: { id: string; value: any }) => Promise<any>;
   delete: ({ id }: { id: string }) => Promise<any>;
}

const usePermissionStore = create<PermissionState>()(
   persist(
      (set, get) => ({
         permissions: [],
         all: async () => {
            try {
               const response = await protectedApi.get("/permissions");
               if (response.data.success && response.data.data) {
                  set({ permissions: response.data.data });
               }
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         detail: async ({ id }) => {
            try {
               const response = await protectedApi.get(`/permissions/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         add: async ({ data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(`/permissions/`, body);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         update: async ({ id, data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(
                  `/permissions/${id}`,
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
                  `/permissions/${id}/value`,
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
               const response = await protectedApi.delete(`/permissions/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
      }),
      {
         name: "setting-store", // key di localStorage
         partialize: (state) => ({
            permissions: state.permissions,
         }), // hanya simpan ini
      }
   )
);

export default usePermissionStore;
