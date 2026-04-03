import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { protectedApi } from 'src/lib/al/axios';

// ----------------------------------------------------------------------

export interface SalaryReportItem {
  user_id: string;
  name: string;
  daily_salary: number;
  hourly_salary: number;
  work_days: number;
  total_salary: number;
}

interface SalaryState {
  report: SalaryReportItem[];

  updateSalary: (
    userId: string,
    data: { daily_salary?: number; hourly_salary?: number }
  ) => Promise<any>;

  getSalaryReport: (params: { month: string; user_id?: string }) => Promise<any>;

  exportSalaryReport: (params: {
    month: string;
    user_id?: string;
    format: 'xlsx' | 'csv';
  }) => Promise<void>;
}

// ----------------------------------------------------------------------

const useSalaryStore = create<SalaryState>()(
  persist(
    (set) => ({
      report: [],

      updateSalary: async (userId, data) => {
        const response = await protectedApi.post(`/users/${userId}/salary`, data);
        return response.data;
      },

      getSalaryReport: async ({ month, user_id }) => {
        const params: Record<string, string> = { month };
        if (user_id) params.user_id = user_id;
        const response = await protectedApi.get('/salary/report', { params });
        if (response.data?.success && response.data?.data?.data) {
          set({ report: response.data.data.data });
        }
        return response.data;
      },

      exportSalaryReport: async ({ month, user_id, format }) => {
        const params: Record<string, string> = { month, format };
        if (user_id) params.user_id = user_id;

        const response = await protectedApi.get('/salary/report/export', {
          params,
          responseType: 'blob',
        });

        // Trigger file download di browser
        const blob = new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `salary-report-${month}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: 'salary-store',
      partialize: (state) => ({
        report: state.report,
      }),
    }
  )
);

export default useSalaryStore;
