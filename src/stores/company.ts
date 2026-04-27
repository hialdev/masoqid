import { create } from 'zustand';

import { protectedApi } from '../lib/al/axios';

export interface CompanyData {
   id: string;
   logo?: string | null;
   name: string;
   address: string;
   phone: string;
   pic_name: string;
   email: string;
   created_at?: string;
   updated_at?: string;
}

interface CompanyState {
   companies: CompanyData[];
   loading: boolean;
   error: string | null;

   getAll: (params?: { page?: number; limit?: number; search?: string }) => Promise<any>;
   getById: (id: string) => Promise<CompanyData>;
   create: (data: FormData) => Promise<any>;
   update: (id: string, data: FormData) => Promise<any>;
   delete: (id: string) => Promise<any>;
}

const useCompanyStore = create<CompanyState>((set, get) => ({
   companies: [],
   loading: false,
   error: null,

   getAll: async (params = {}) => {
      try {
         set({ loading: true, error: null });
         const { page = 1, limit = 10, search = '' } = params;

         const res = await protectedApi.get(`/companies`, {
            params: { page, limit, search },
         });

         set({
            companies: res.data.data.data || [],
            loading: false,
         });

         return res.data.data;
      } catch (err: any) {
         console.error('[Company] Get all error:', err);
         set({
            error: err.response?.data?.message || 'Failed to fetch companies',
            loading: false,
         });
         return null;
      }
   },

   getById: async (id: string) => {
      try {
         const res = await protectedApi.get(`/companies/${id}`);
         return res.data.data;
      } catch (err: any) {
         console.error('[Company] Get by id error:', err);
         throw err;
      }
   },

   create: async (data: FormData) => {
      try {
         const res = await protectedApi.post(`/companies`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('[Company] Create error:', err);
         throw err;
      }
   },

   update: async (id: string, data: FormData) => {
      try {
         const res = await protectedApi.patch(`/companies/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('[Company] Update error:', err);
         throw err;
      }
   },

   delete: async (id: string) => {
      try {
         const res = await protectedApi.delete(`/companies/${id}`);

         // Refresh list
         await get().getAll();

         return res.data;
      } catch (err: any) {
         console.error('[Company] Delete error:', err);
         throw err;
      }
   },
}));

export default useCompanyStore;
