import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { protectedApi } from 'src/lib/al/axios';

// ----------------------------------------------------------------------

export interface ShiftData {
  id: string;
  user_id: string;
  date: string;       // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  note?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name?: string;
    image?: string;
  };
}

export interface ShiftInput {
  user_id: string;
  office_id?: string;  // office yang sedang aktif dipilih
  date: string;
  start_time: string;
  end_time: string;
  note?: string;
}

interface ShiftState {
  shifts: ShiftData[];
  myShifts: ShiftData[];

  getMonthlySchedule: (params: { month: string; office_id?: string; user_id?: string }) => Promise<any>;
  getAllShifts: (params?: {
    page?: number;
    limit?: number;
    month?: string;
    office_id?: string;
    user_id?: string;
  }) => Promise<any>;
  getMyShifts: (params?: { month?: string }) => Promise<any>;
  getShiftById: (id: string) => Promise<any>;
  createShift: (data: ShiftInput) => Promise<any>;
  updateShift: (id: string, data: Partial<ShiftInput>) => Promise<any>;
  deleteShift: (id: string) => Promise<any>;
  switchShifts: (shiftAId: string, shiftBId: string) => Promise<any>;
  bulkCreateShifts: (shifts: ShiftInput[]) => Promise<any>;
  bulkDeleteShifts: (shiftIds: string[]) => Promise<any>;
}

// ----------------------------------------------------------------------

const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      shifts: [],
      myShifts: [],

      getMonthlySchedule: async ({ month, office_id, user_id }) => {
        const params: Record<string, string> = { month };
        if (office_id) params.office_id = office_id;
        if (user_id) params.user_id = user_id;
        const response = await protectedApi.get('/shifts', { params });
        if (response.data?.success && response.data?.data?.data) {
          set({ shifts: response.data.data.data });
        }
        return response.data;
      },

      getAllShifts: async (params) => {
        const queryParams: Record<string, string | number> = {};
        if (params?.page !== undefined) queryParams.page = params.page;
        if (params?.limit !== undefined) queryParams.limit = params.limit;
        if (params?.month) queryParams.month = params.month;
        if (params?.office_id) queryParams.office_id = params.office_id;
        if (params?.user_id) queryParams.user_id = params.user_id;
        const response = await protectedApi.get('/shifts/all', { params: queryParams });
        if (response.data?.success && response.data?.data?.data) {
          set({ shifts: response.data.data.data });
        }
        return response.data;
      },

      getMyShifts: async (params) => {
        const queryParams: Record<string, string> = {};
        if (params?.month) queryParams.month = params.month;
        const response = await protectedApi.get('/my-shifts', { params: queryParams });
        if (response.data?.success && response.data?.data?.data) {
          set({ myShifts: response.data.data.data });
        }
        return response.data;
      },

      getShiftById: async (id) => {
        const response = await protectedApi.get(`/shifts/${id}`);
        return response.data;
      },

      createShift: async (data) => {
        const response = await protectedApi.post('/shifts', data);
        return response.data;
      },

      updateShift: async (id, data) => {
        const response = await protectedApi.patch(`/shifts/${id}`, data);
        return response.data;
      },

      deleteShift: async (id) => {
        const response = await protectedApi.delete(`/shifts/${id}`);
        return response.data;
      },

      switchShifts: async (shiftAId, shiftBId) => {
        const response = await protectedApi.post('/shifts/switch', {
          shift_a_id: shiftAId,
          shift_b_id: shiftBId,
        });
        return response.data;
      },

      bulkCreateShifts: async (shifts) => {
        const response = await protectedApi.post('/shifts/bulk', { shifts });
        return response.data;
      },

      bulkDeleteShifts: async (shiftIds) => {
        // Axios delete body dikirim di "data"
        const response = await protectedApi.delete('/shifts/bulk', { data: { shift_ids: shiftIds } });
        return response.data;
      },
    }),
    {
      name: 'shift-store',
      partialize: (state) => ({
        shifts: state.shifts,
        myShifts: state.myShifts,
      }),
    }
  )
);

export default useShiftStore;
