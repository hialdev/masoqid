import type { RoleData } from './role';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { api, protectedApi } from '../lib/al/axios';

interface AuthData {
   userId: string | null;
   permissions: any | null;
}

interface UserData {
   id?: string | null;
   username?: string;
   email?: string;
   phone?: string | number;
   name?: string;
   image?: string;
   role?: RoleData | null;
   company_id?: string | null;
   office_id?: string | null;
   company?: any;
   office?: any;
}

interface AuthState {
   authData: AuthData;
   user: UserData | null;
   isLoggedOut: boolean;
   registData: {
      isEmail: boolean;
      phone: string | number | null;
      email: string | null;
      purpose: string | undefined | null;
   };

   getUser: () => void;
   setRegist: ({
      isEmail,
      phone,
      email,
      purpose,
   }: {
      isEmail: boolean;
      phone: string | number | null;
      email: string | null;
      purpose: string | undefined | null;
   }) => void;
   isExists: (phone: string) => Promise<any>;
   sendOTP: ({
      login,
      isEmail,
      country_code,
   }: {
      login: string;
      isEmail: boolean;
      country_code: string;
   }) => Promise<any>;
   validateOTP: ({ code, purpose }: { code: string; purpose: string }) => Promise<any>;
   fetchPermissions: () => Promise<void>;
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
         registData: { isEmail: false, phone: null, email: null, purpose: null },
         isLoggedOut: false,

         getUser: () => {
            set((state) => ({
               user: state.user || get().authData.userId ? { id: get().authData.userId } : null,
            }));
         },

         setRegist: ({ isEmail, phone, email, purpose }: any) => {
            set({ registData: { isEmail, phone, email, purpose } });
         },

         sendOTP: async ({ login, isEmail, country_code }) => {
            try {
               const body = {
                  login,
                  is_email: isEmail,
                  country_code,
               };

               const res = await api.post(`/otp/request`, body);

               return res.data;
            } catch (err) {
               console.error('Check exists error:', err);
               throw err;
            }
         },

         validateOTP: async ({ code, purpose }) => {
            try {
               const res = await api.post(`/otp/validate`, { code, purpose });
               return res.data;
            } catch (err) {
               console.error('Check exists error:', err);
               throw err;
            }
         },

         isExists: async (phone) => {
            try {
               const res = await api.get(`/auth/check-exists?phone=${phone}`);
               return res.data;
            } catch (err) {
               console.error('Check exists error:', err);
               throw err;
            }
         },

         // ✅ Fetch permissions from API and cache in store
         fetchPermissions: async () => {
            try {
               const res = await protectedApi.get(`/auth/permissions`);
               set((state) => ({
                  authData: {
                     ...state.authData,
                     permissions: res.data.data,
                  },
               }));
            } catch (err) {
               console.error('Fetch permissions error:', err);
               // Set empty permissions on error
               set((state) => ({
                  authData: {
                     ...state.authData,
                     permissions: [],
                  },
               }));
            }
         },

         login: async ({ login, purpose, code }) => {
            try {
               const res = await api.post(`/auth/login`, {
                  login,
                  code,
                  purpose,
               });

               // ✅ Set user data and permissions from response (backend still returns for initial load)
               set({
                  authData: {
                     userId: res.data.data.user?.id,
                     permissions: res.data.data.permissions,
                  },
                  user: res.data.data.user,
                  isLoggedOut: false,
               });

               if (res.data.success) {
                  set(() => ({
                     registData: undefined,
                  }));
               }

               return res.data;
            } catch (err) {
               console.error('Login error:', err);
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

               if (res.data.success) {
                  set(() => ({
                     registData: undefined,
                  }));
               }

               return res.data;
            } catch (err) {
               console.error('Register error:', err);
               throw err;
            }
         },

         logout: async () => {
            // ─── Bersihkan state lokal terlebih dahulu ──────────────────────────
            set({
               authData: {
                  userId: null,
                  permissions: null,
               },
               registData: undefined,
               user: null,
               isLoggedOut: true,
            });

            try {
               // Panggil API logout (Next.js route handler yang akan handle cookie)
               await protectedApi.post(`/auth/logout`);
            } catch (err) {
               console.warn(
                  '[Auth] Logout server call gagal, tapi local state sudah dibersihkan:',
                  err
               );
            }

            // ─── Force full page reload untuk clear SSR cache + cookie di browser ─
            if (typeof window !== 'undefined') {
               window.location.href = '/auth/sign-in?from=refresh-failed';
            }

            return { success: true };
         },

         refreshToken: async () => {
            try {
               const res = await protectedApi.post(`/auth/refresh`, null, {
                  withCredentials: true,
               });

               // ─── Update permissions dari response refresh ──────────────────
               set((state) => ({
                  authData: {
                     ...state.authData,
                     permissions: res.data.data?.permissions || state.authData.permissions,
                  },
                  user: res.data.data?.user || state.user,
                  isLoggedOut: false,
               }));
            } catch (err) {
               console.error('[Auth] Token refresh failed:', err);
               // ─── Jangan panggil get().logout() langsung karena itu akan ──────
               // ─── mengirim request baru yang mungkin juga gagal → bersihkan ──
               // ─── state saja, biarkan interceptor/guard handle redirect ───────
               set({
                  authData: { userId: null, permissions: null },
                  user: null,
                  isLoggedOut: true,
               });
               // Force redirect ke sign-in dengan flag
               if (typeof window !== 'undefined') {
                  window.location.href = '/auth/sign-in?from=refresh-failed';
               }
            }
         },
      }),
      {
         name: 'auth-store', // key di localStorage
         partialize: (state) => ({
            authData: state.authData,
            user: state.user,
            registData: state.registData,
         }), // hanya simpan ini
      }
   )
);

export default useAuthStore;
