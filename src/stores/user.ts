import type { RoleData } from "./role";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { protectedApi } from "src/lib/al/axios";

export interface UserData {
   id : string,
   username? : string,
   country_code? : string,
   image? : string | File,
   email?: string,
   phone?: string | number,
   name?: string,
   role_id?: string | null,

   role?: RoleData,
}

interface UserState {
   users: UserData | null;

   all: ({page, limit, search, sort, order} : {page?: number | string, limit?: number | string, role?:string, search?: string, sort: string, order: "desc" | "asc"}) => Promise<any>;
   add: (data : UserData) => Promise<any>;
   detail: ({id} : {id: string}) => Promise<any>;
   update: ({id, data} : {id: string, data: UserData}) => Promise<any>;
   assign: ({id, role_id} : {id: string, role_id: string}) => Promise<any>;
   delete: ({id} : {id: string}) => Promise<any>;
}

const useUserStore = create<UserState>()(
   persist(
      (set, get) => ({
         users: null,
         all: async ({page, limit, search, role, sort, order}) => {
            try {
               const params = { page, limit, role, search, sort, order };
               const response = await protectedApi.get("/users", { params });
               set({ users: response.data });
               return response.data;
            } catch (error) {
               return {success:false, message:error};
            }
         },
         add: async (data) => {
            try {
               let payload: UserData | FormData = data;
               let config = {};

               // Jika ada field image yang instanceof File, gunakan FormData
               if (data.image instanceof File) {
                  const formData = new FormData();

                  // Mapping field satu per satu — aman dari TypeScript
                  if (data.name) formData.append("name", data.name);
                  if (data.username) formData.append("username", data.username);
                  if (data.country_code) formData.append("country_code", data.country_code);
                  if (data.email) formData.append("email", data.email);
                  if (data.phone) formData.append("phone", String(data.phone)); // pastikan string
                  if (data.role_id) formData.append("role_id", data.role_id);
                  formData.append("image", data.image); // image selalu ada di sini (karena dicek instanceof File)

                  payload = formData;
                  config = {
                     headers: {
                        "Content-Type": "multipart/form-data",
                     },
                  };
               }

               const response = await protectedApi.post(`/users`, payload, config);
               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || "Unknown error",
               };
            }
         },
         detail: async ({id}) => {
            try {
               const response = await protectedApi.get(`/users/${id}`);
               return response.data;
            } catch (error) {
               return {success:false, message:error};
            }
         },
         update: async ({id, data}) => {
            try {
               let payload: UserData | FormData = data;
               let config = {};

               // Jika ada field image yang instanceof File, gunakan FormData
               if (data.image instanceof File) {
                  const formData = new FormData();

                  if (data.name) formData.append("name", data.name);
                  if (data.username) formData.append("username", data.username);
                  if (data.country_code) formData.append("country_code", data.country_code);
                  if (data.email) formData.append("email", data.email);
                  if (data.phone) formData.append("phone", String(data.phone)); // pastikan string
                  if (data.role_id) formData.append("role_id", data.role_id);
                  formData.append("image", data.image); // image selalu ada di sini (karena dicek instanceof File)

                  payload = formData;
                  config = {
                     headers: {
                        "Content-Type": "multipart/form-data",
                     },
                  };
               }

               const response = await protectedApi.post(`/users/${id}`, payload, config);
               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || "Unknown error",
               };
            }
         },
         assign: async ({id, role_id}) => {
            try {
               const payload = { role_id};
               const response = await protectedApi.post(`/users/${id}/assign`, payload);
               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || "Unknown error",
               };
            }
         },
         delete: async ({id}) => {
            const response = await protectedApi.delete(`/users/${id}`);
            return response.data;
         },
       }),
      {
         name: "user-store", // key di localStorage
         partialize: (state) => ({
            users: state.users,
         }), // hanya simpan ini
      }
   )
);

export default useUserStore;
