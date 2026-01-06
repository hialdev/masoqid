import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { protectedApi } from '../lib/al/axios';

export interface AttendanceSuspiciousLog {
   id: string;
   rule_code: string;
   rule_description: string;
   score: number;
}

export interface Attendance {
   id: string;
   user_id: string;
   attendance_type: string;
   attendance_time: string;
   latitude: number;
   longitude: number;
   location_accuracy: number;
   photo_url: string;
   status: string; // VALID, SUSPICIOUS, INVALID
   suspicious_score: number;
   suspicious_logs?: AttendanceSuspiciousLog[];
   created_at: string;
   user?: any;
   ip_address?: string;
   user_agent?: string;
}

interface AttendanceState {
   attendances: Attendance[];
   myAttendances: Attendance[];

   checkIn: (data: FormData | any) => Promise<any>;
   checkOut: (data: FormData | any) => Promise<any>;
   getMyAttendance: (params?: any) => Promise<any>;
   getAllAttendance: (params?: any) => Promise<any>;
}

const useAttendanceStore = create<AttendanceState>()(
   persist(
      (set, get) => ({
         attendances: [],
         myAttendances: [],

         checkIn: async (data) => {
            let config = {};
            // If data is FormData, set headers
            if (data instanceof FormData) {
               config = { headers: { 'Content-Type': 'multipart/form-data' } };
            }
            const response = await protectedApi.post('/attendance/check-in', data, config);
            return response.data;
         },
         checkOut: async (data) => {
            let config = {};
            if (data instanceof FormData) {
               config = { headers: { 'Content-Type': 'multipart/form-data' } };
            }
            const response = await protectedApi.post('/attendance/check-out', data, config);
            return response.data;
         },
         getMyAttendance: async (params) => {
            const queryParams = new URLSearchParams();
            if (params) {
               if (params.start_date) queryParams.append('start_date', params.start_date);
               if (params.end_date) queryParams.append('end_date', params.end_date);
               if (params.type) queryParams.append('type', params.type);
               if (params.status) queryParams.append('status', params.status);
            }
            const queryString = queryParams.toString();
            const url = queryString ? `/my-attendance?${queryString}` : '/my-attendance';

            const response = await protectedApi.get(url);
            if (response.data.success && response.data.data) {
               set({ myAttendances: response.data.data });
            }
            return response.data;
         },
         getAllAttendance: async (params) => {
            const queryParams = new URLSearchParams();
            if (params) {
               if (params.page !== undefined) queryParams.append('page', params.page.toString());
               if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
               if (params.user_id !== undefined) queryParams.append('user_id', params.user_id);
               if (params.user_ids !== undefined) queryParams.append('user_ids', params.user_ids);
               if (params.start_date) queryParams.append('start_date', params.start_date);
               if (params.end_date) queryParams.append('end_date', params.end_date);
               if (params.type) queryParams.append('type', params.type);
               if (params.status) queryParams.append('status', params.status);
            }
            const queryString = queryParams.toString();
            const url = queryString ? `/attendance?${queryString}` : '/attendance';
            const response = await protectedApi.get(url);
            if (response.data.success && response.data.data) {
               // backend returns { data: [], total: ... } inside result
               set({ attendances: response.data.data.data });
            }
            return response.data;
         },
      }),
      {
         name: 'attendance-store',
         partialize: (state) => ({
            attendances: state.attendances,
            myAttendances: state.myAttendances,
         }),
      }
   )
);

export default useAttendanceStore;
