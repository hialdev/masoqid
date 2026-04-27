import { create } from 'zustand';

import { protectedApi } from '../lib/al/axios';

export interface EmployeeData {
   id: string;
   user_id: string;
   nik: string;
   nip?: string | null;
   npwp?: string | null;
   address: string;
   office_id?: string | null;
   company_id?: string | null;
   user?: any;
   office?: any;
   company?: any;
   created_at?: string;
   updated_at?: string;
}

interface EmployeeState {
   employees: EmployeeData[];
   loading: boolean;
   error: string | null;

   getAll: (params?: { page?: number; limit?: number; search?: string; office_id?: string; company_id?: string }) => Promise<any>;
   getById: (id: string) => Promise<EmployeeData>;
   create: (data: Partial<EmployeeData>) => Promise<any>;
   update: (id: string, data: Partial<EmployeeData>) => Promise<any>;
   delete: (id: string) => Promise<any>;
}

const useEmployeeStore = create<EmployeeState>((set, get) => ({
   employees: [],
   loading: false,
   error: null,

   getAll: async (params = {}) => {
      try {
         set({ loading: true, error: null });
         
         const res = await protectedApi.get(`/profiles`, {
            params,
         });

         set({
            employees: res.data.data.data || [],
            loading: false,
         });

         return res.data;
      } catch (err: any) {
         console.error('Get employees error:', err);
         set({
            error: err.response?.data?.message || 'Failed to fetch employees',
            loading: false,
         });
         return { data: { data: [], total: 0 } };
      }
   },

   getById: async (id: string) => {
      try {
         const res = await protectedApi.get(`/profiles/${id}`);
         return res.data.data;
      } catch (err: any) {
         console.error('Get employee error:', err);
         throw err;
      }
   },

   create: async (data: Partial<EmployeeData>) => {
      try {
         const res = await protectedApi.post(`/profiles`, data);
         await get().getAll();
         return res.data;
      } catch (err: any) {
         console.error('Create employee error:', err);
         throw err;
      }
   },

   update: async (id: string, data: Partial<EmployeeData>) => {
      try {
         const res = await protectedApi.patch(`/profiles/${id}`, data);
         await get().getAll();
         return res.data;
      } catch (err: any) {
         console.error('Update employee error:', err);
         throw err;
      }
   },

   delete: async (id: string) => {
      try {
         const res = await protectedApi.delete(`/profiles/${id}`);
         await get().getAll();
         return res.data;
      } catch (err: any) {
         console.error('Delete employee error:', err);
         throw err;
      }
   },
}));

export default useEmployeeStore;
