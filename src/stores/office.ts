import { create } from 'zustand';

import { protectedApi } from '../lib/al/axios';

export interface OfficeData {
   id: string;
   name: string;
   description?: string;
   address: string;
   latitude: number;
   longitude: number;
   is_strict_radius: boolean;
   radius_for_checkin: boolean;
   radius_for_checkout: boolean;
   radius_allow: number;
   users?: any[];
   user_count?: number;
   created_at?: string;
   updated_at?: string;
}

interface OfficeState {
   offices: OfficeData[];
   loading: boolean;
   error: string | null;

   getAll: (params?: { page?: number; limit?: number; search?: string }) => Promise<any>;
   getById: (id: string) => Promise<OfficeData>;
   create: (data: Partial<OfficeData>) => Promise<any>;
   update: (id: string, data: Partial<OfficeData>) => Promise<any>;
   delete: (id: string) => Promise<any>;
   assignUsers: (officeId: string, userIds: string[]) => Promise<any>;
   getOfficeUsers: (officeId: string) => Promise<any[]>;
}

const useOfficeStore = create<OfficeState>((set, get) => ({
   offices: [],
   loading: false,
   error: null,

   getAll: async (params = {}) => {
      try {
         set({ loading: true, error: null });
         const { page = 1, limit = 10, search = '' } = params;

         const res = await protectedApi.get(`/offices`, {
            params: { page, limit, search },
         });

         set({
            offices: res.data.data.data || [],
            loading: false,
         });

         return res.data.data.data || [];
      } catch (err: any) {
         console.error('Get offices error:', err);
         set({
            error: err.response?.data?.message || 'Failed to fetch offices',
            loading: false,
         });
         return [];
      }
   },

   getById: async (id: string) => {
      try {
         const res = await protectedApi.get(`/offices/${id}`);
         return res.data.data;
      } catch (err: any) {
         console.error('Get office error:', err);
         throw err;
      }
   },

   create: async (data: Partial<OfficeData>) => {
      try {
         const res = await protectedApi.post(`/offices`, data);

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('Create office error:', err);
         throw err;
      }
   },

   update: async (id: string, data: Partial<OfficeData>) => {
      try {
         const res = await protectedApi.patch(`/offices/${id}`, data);

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('Update office error:', err);
         throw err;
      }
   },

   delete: async (id: string) => {
      try {
         const res = await protectedApi.delete(`/offices/${id}`);

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('Delete office error:', err);
         throw err;
      }
   },

   assignUsers: async (officeId: string, userIds: string[]) => {
      try {
         const res = await protectedApi.post(`/offices/${officeId}/assign-users`, {
            user_ids: userIds,
         });

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('Assign users error:', err);
         throw err;
      }
   },

   getOfficeUsers: async (officeId: string) => {
      try {
         const res = await protectedApi.get(`/offices/${officeId}/users`);
         return res.data.data;
      } catch (err: any) {
         console.error('Get office users error:', err);
         throw err;
      }
   },
}));

export default useOfficeStore;
