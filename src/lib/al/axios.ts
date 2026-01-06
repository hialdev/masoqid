import axios from "axios";
import { toast } from "sonner";

import { CONFIG } from "src/global-config";
import useAuthStore from "src/stores/auth";

// Instance untuk request publik (login, register, dll)
export const api = axios.create({
   baseURL: CONFIG.apiUrl,
   withCredentials: true,
   headers: {
      "Content-Type": "application/json",
   },
});

// Instance untuk request protected (JWT + auto refresh)
export const protectedApi = axios.create({
   baseURL: CONFIG.apiUrl,
   withCredentials: true,
   headers: {
      "Content-Type": "application/json",
   },
});

const excludedUrls = ["/auth/refresh", "/auth/logout"];

protectedApi.interceptors.response.use(
   (res) => res,
   async (error) => {
      const originalRequest = error.config;
      const rawMessage = error.response?.data?.message;

      if (excludedUrls.some((url) => originalRequest.url?.includes(url))) {
         return Promise.reject(error);
      }

      // ➤ Handle 403: Coba refresh token sekali untuk dapat permission terbaru
      if (error.response?.status === 403) {
         const message =
            rawMessage || "Akses ditolak. Anda tidak memiliki izin.";
         toast.error(message, { duration: 2000 });
         return Promise.reject(error);
      }

      // ➤ Handle 401: Token expired
      if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true;

         try {
            await useAuthStore.getState().refreshToken();
            return protectedApi(originalRequest);
         } catch (err) {
            await useAuthStore.getState().logout();
            toast.error("🔒 Sesi berakhir. Silakan login kembali.", {
               duration: 2000,
            });
         }
      }

      // ➤ Handle error lainnya
      if (rawMessage) {
         toast.error(rawMessage, { duration: 2000 });
      }

      return Promise.reject(error);
   }
);
