import type { PermissionData } from "./permission";

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

export interface RoleData {
   id?: string;
   name: string;
   description?: string;
   permissions?: (string | PermissionData)[]; 
   created_at?: string;
   updated_at?: string;
}


interface RoleState {
   roles: RoleData[];

   all: () => Promise<any>;
   detail: ({ id }: { id: string }) => Promise<any>;
   add: ({ data }: { data: RoleData }) => Promise<any>;
   update: ({ id, data }: { id: string; data: RoleData }) => Promise<any>;
   delete: ({ id }: { id: string }) => Promise<any>;
}

const useRoleStore = create<RoleState>()(
   persist(
      (set, get) => ({
         roles: [],
         all: async () => {
            try {
               const response = await protectedApi.get("/roles");
               if (response.data.success && response.data.data) {
                  set({ roles: response.data.data });
               }
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         detail: async ({ id }) => {
            try {
               const response = await protectedApi.get(`/roles/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         add: async ({ data }) => {
            try {
               const body = data;
               const response = await protectedApi.post(`/roles/`, body);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         update: async ({ id, data }) => {
            try {
               const body = data;
               const response = await protectedApi.patch(
                  `/roles/${id}`,
                  body
               );
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         delete: async ({ id }) => {
            try {
               const response = await protectedApi.delete(`/roles/${id}`);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
      }),
      {
         name: "setting-store", // key di localStorage
         partialize: (state) => ({
            roles: state.roles,
         }), // hanya simpan ini
      }
   )
);

export default useRoleStore;
