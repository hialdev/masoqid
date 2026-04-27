import { create } from 'zustand';

import { protectedApi } from '../lib/al/axios';

export interface ShiftSwitchData {
   id: string;
   requester_id: string;
   target_id: string;
   requester_shift_id: string;
   target_shift_id: string;
   status: 'pending' | 'approved' | 'rejected';
   reason?: string | null;
   review_note?: string | null;
   reviewed_by?: string | null;
   reviewed_at?: string | null;
   created_at?: string;
}

interface ShiftSwitchState {
   requests: ShiftSwitchData[];
   myRequests: ShiftSwitchData[];
   logs: any[];
   loading: boolean;
   error: string | null;

   getAll: (params?: { page?: number; limit?: number; status?: string }) => Promise<any>;
   getMyRequests: () => Promise<any>;
   getLogs: (params?: { page?: number; limit?: number }) => Promise<any>;
   createRequest: (data: { target_id: string; requester_shift_id: string; target_shift_id: string; reason?: string }) => Promise<any>;
   approveRequest: (id: string, review_note?: string) => Promise<any>;
   rejectRequest: (id: string, review_note?: string) => Promise<any>;
}

const useShiftSwitchStore = create<ShiftSwitchState>((set, get) => ({
   requests: [],
   myRequests: [],
   logs: [],
   loading: false,
   error: null,

   getLogs: async (params = {}) => {
      try {
         set({ loading: true, error: null });
         const res = await protectedApi.get(`/shift-logs`, { params });
         set({
            logs: res.data.data.data || [],
            loading: false,
         });
         return res.data;
      } catch (err: any) {
         set({ loading: false, error: err.response?.data?.message || 'Failed to fetch logs' });
         return { data: { data: [], total: 0 } };
      }
   },

   getAll: async (params = {}) => {
      try {
         set({ loading: true, error: null });
         
         const res = await protectedApi.get(`/shift-switch-requests`, {
            params,
         });

         set({
            requests: res.data.data.data || [],
            loading: false,
         });

         return res.data;
      } catch (err: any) {
         console.error('Get switch requests error:', err);
         set({
            error: err.response?.data?.message || 'Failed to fetch switch requests',
            loading: false,
         });
         return { data: { data: [], total: 0 } };
      }
   },

   getMyRequests: async () => {
      try {
         const res = await protectedApi.get(`/my-shift-switch-requests`);
         set({
            myRequests: res.data.data || [],
         });
         return res.data;
      } catch (err: any) {
         console.error('Get my switch requests error:', err);
         throw err;
      }
   },

   createRequest: async (data) => {
      try {
         const res = await protectedApi.post(`/shift-switch-requests`, data);
         await get().getMyRequests();
         return res.data;
      } catch (err: any) {
         console.error('Create switch request error:', err);
         throw err;
      }
   },

   approveRequest: async (id, review_note) => {
      try {
         const res = await protectedApi.patch(`/shift-switch-requests/${id}/approve`, { review_note });
         await get().getAll();
         return res.data;
      } catch (err: any) {
         console.error('Approve switch request error:', err);
         throw err;
      }
   },

   rejectRequest: async (id, review_note) => {
      try {
         const res = await protectedApi.patch(`/shift-switch-requests/${id}/reject`, { review_note });
         await get().getAll();
         return res.data;
      } catch (err: any) {
         console.error('Reject switch request error:', err);
         throw err;
      }
   },
}));

export default useShiftSwitchStore;
