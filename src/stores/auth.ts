import type { RoleData } from "./role";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api, protectedApi } from "../lib/al/axios";

interface AuthData {
   userId: string | null;
   permissions: any | null;
}

interface UserData {
   id? : string | null,
   username? : string,
   email?: string,
   phone?: string | number,
   name?: string,
   image?: string,
   role?: RoleData | null
}

interface AuthState {
   authData: AuthData;
   user: UserData | null;
   isLoggedOut: boolean;
   registData: {isEmail: boolean, phone: string | number | null, email: string | null, purpose: string | undefined | null};

   getUser: () => void;
   setRegist: ({isEmail, phone, email, purpose} : {isEmail: boolean, phone: string | number | null, email: string | null, purpose: string | undefined | null}) => void;
   isExists: (phone: string) => Promise<any>;
   sendOTP: ({ login, isEmail, country_code }: {login: string, isEmail:boolean, country_code: string}) => Promise<any>;
   validateOTP: ({ code, purpose }: {code: string, purpose:string}) => Promise<any>;
   login: ({ login, purpose, code }: any) => Promise<any>;
   register: ({ name, username, phone, country_code, email }: any) => Promise<any>;
   logout: () => Promise<any>;
   refreshToken: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
   persist(
      (set, get) => ({
         authData: { userId: null, permissions: null, accessToken: null },
         user: null,
         registData: {isEmail:false , phone: null, email: null, purpose: null},
         isLoggedOut: false,
         
         getUser: () => {
            set((state) => ({
               user:
                  state.user || get().authData.userId
                     ? { id: get().authData.userId }
                     : null,
            }));
         },

         setRegist: ({isEmail, phone, email, purpose} : any) => {
            set({ registData: {isEmail, phone, email, purpose} });
         },

         sendOTP: async ({ login, isEmail, country_code }) => {
            try {
               const body = {
                  login, is_email: isEmail, country_code
               };

               const res = await api.post(
                  `/otp/request`, body
               );

               return res.data;
            } catch (err) {
               console.error("Check exists error:", err);
               throw err;
            }
         },

         validateOTP: async ({ code, purpose }) => {
            try {
               const res = await api.post(
                  `/otp/validate`, { code, purpose }
               );
               return res.data;
            } catch (err) {
               console.error("Check exists error:", err);
               throw err;
            }
         },

         isExists: async (phone) => {
            try {
               const res = await api.get(
                  `/auth/check-exists?phone=${phone}`
               );
               return res.data;
            } catch (err) {
               console.error("Check exists error:", err);
               throw err;
            }
         },

         login: async ({ login, purpose, code }) => {
            try {
               const res = await api.post(`/auth/login`, {
                  login,
                  code,
                  purpose,
               });

               set({
                  authData: {
                     userId: res.data.data.user?.id,
                     permissions: res.data.data.permissions,
                  },
                  user: res.data.data.user,
                  isLoggedOut: false,
               });

               if (res.data.success){
                  set(() => ({
                     registData: undefined,
                  }));
               }

               return res.data;
            } catch (err) {
               console.error("Login error:", err);
               throw err;
            }
         },

         register: async ({ name, username, phone, country_code, email }) => {
            try {
               const res = await api.post(`/auth/register`, {
                  name,
                  username,
                  phone,
                  country_code,
                  email,
                  isEmail: get().registData.isEmail,
               });

               if (res.data.success){
                  set(() => ({
                     registData: undefined,
                  }));
               }

               return res.data;
            } catch (err) {
               console.error("Register error:", err);
               throw err;
            }
         },

         logout: async () => {
            try {
               const res = await protectedApi.post(`/auth/logout`);

               set({
                  authData: {
                  userId: null,
                  permissions: null,
                  },
                  registData: undefined,
                  user: null,
                  isLoggedOut: true,
               });

               return res.data;
            } catch (err) {
               console.warn("Logout gagal (server error), tapi local state sudah dibersihkan:", err);

               set({
                  authData: {
                     userId: null,
                     permissions: null,
                  },
                  registData: undefined,
                  user: null,
                  isLoggedOut: true,
               });
               const msg = "Logout failed, forced local logout"
               return { success: false, error: msg, message: msg };
            }
         },

         refreshToken: async () => {
            try {
               const res = await protectedApi.post(
                  `/auth/refresh`,
                  null,
                  { withCredentials: true }
               );
               const { accessToken } = res.data;

               set((state) => ({
                  authData: { ...state.authData, accessToken },
                  isLoggedOut: false,
               }));
            } catch (err) {
               console.error("Token refresh failed:", err);
               get().logout();
            }
         },
      }),
      {
         name: "auth-store", // key di localStorage
         partialize: (state) => ({
            authData: state.authData,
            user: state.user,
            registData: state.registData,
         }), // hanya simpan ini
      }
   )
);

export default useAuthStore;
