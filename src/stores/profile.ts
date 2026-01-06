import type { RoleData } from './role';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { protectedApi } from 'src/lib/al/axios';
import useAuthStore from './auth';

export interface ProfileData {
   id: string;
   username?: string;
   country_code?: string;
   image?: string | File;
   email?: string;
   phone?: string | number;
   name?: string;
}

export interface ProfileBasicData {
   name?: string;
   image?: string | File;
   username?: string;
}

export interface ProfileUpdateEmail {
   email: string;
   code: string;
}

export interface ProfileUpdatePhone {
   phone: string;
   code: string;
   country_code: string;
}

export interface ProfileRequestChange {
   user_id: string;
   email?: string;
   phone?: string;
   is_email: boolean;
   country_code?: string;
}

interface ProfileState {
   profile: ProfileData | null;

   detail: () => Promise<any>;
   requestChange: ({ data }: { data: ProfileRequestChange }) => Promise<any>;
   updateBasic: ({ data }: { data: ProfileBasicData }) => Promise<any>;
   updateEmail: ({ data }: { data: ProfileUpdateEmail }) => Promise<any>;
   updatePhone: ({ data }: { data: ProfileUpdatePhone }) => Promise<any>;
}

const useProfileStore = create<ProfileState>()(
   persist(
      (set, get) => ({
         profile: null,
         detail: async () => {
            try {
               const response = await protectedApi.get('/profile');
               set({ profile: response.data.data });
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         requestChange: async ({ data }: { data: ProfileRequestChange }) => {
            try {
               const user = get().profile;
               if (!user) {
                  return { success: false, message: 'User not found' };
               }
               const response = await protectedApi.post('/otp/request-change', data);
               return response.data;
            } catch (error) {
               return { success: false, message: error };
            }
         },
         updateBasic: async ({ data }: { data: ProfileBasicData }) => {
            try {
               let payload: ProfileBasicData | FormData = data;
               let config = {};

               // Jika ada field image yang instanceof File, gunakan FormData
               if (data.image instanceof File) {
                  const formData = new FormData();

                  // Mapping field satu per satu — aman dari TypeScript
                  if (data.name) formData.append('name', data.name);
                  if (data.username) formData.append('username', data.username);
                  formData.append('image', data.image); // image selalu ada di sini (karena dicek instanceof File)

                  payload = formData;
                  config = {
                     headers: {
                        'Content-Type': 'multipart/form-data',
                     },
                  };
               }

               const response = await protectedApi.post(`/profile/change`, payload, config);
               if (response.data.success) {
                  const update = response.data.data;

                  // update profile store
                  set({ profile: { ...get().profile, ...update } });

                  // update di auth-store
                  useAuthStore.setState((state) => ({
                     user: { ...state.user, ...update },
                  }));
               }
               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || 'Unknown error',
               };
            }
         },
         updateEmail: async ({ data }) => {
            try {
               let payload: ProfileUpdateEmail | FormData = data;

               const response = await protectedApi.post(`/profile/change/email`, payload);
               if (response.data.success) {
                  const update = response.data.data;

                  // update profile store
                  set({ profile: { ...get().profile, ...update } });

                  // update di auth-store
                  useAuthStore.setState((state) => ({
                     user: { ...state.user, ...update },
                  }));
               }

               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || 'Unknown error',
               };
            }
         },
         updatePhone: async ({ data }) => {
            try {
               let payload: ProfileUpdatePhone | FormData = data;

               const response = await protectedApi.post(`/profile/change/phone`, payload);
               if (response.data.success) {
                  const update = response.data.data;

                  // update profile store
                  set({ profile: { ...get().profile, ...update } });

                  // update di auth-store
                  useAuthStore.setState((state) => ({
                     user: { ...state.user, ...update },
                  }));
               }

               return response.data;
            } catch (error) {
               return {
                  success: false,
                  message: error || 'Unknown error',
               };
            }
         },
      }),
      {
         name: 'profile-store', // key di localStorage
         partialize: (state) => ({
            profile: state.profile,
         }), // hanya simpan ini
      }
   )
);

export default useProfileStore;
