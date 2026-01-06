import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { protectedApi } from '../lib/al/axios';
import { ExampleRich } from '../types/example-rich';

export interface ExampleRichData extends ExampleRich {}

interface ExampleRichState {
   exampleRiches: ExampleRichData[];

   all: (params?: any) => Promise<any>;
   detail: ({ id }: { id: string }) => Promise<any>;
   add: ({ data }: { data: ExampleRichData }) => Promise<any>;
   update: ({ id, data }: { id: string; data: ExampleRichData }) => Promise<any>;
   delete: ({ id }: { id: string }) => Promise<any>;
}

const useExampleRichStore = create<ExampleRichState>()(
   persist(
      (set, get) => ({
         exampleRiches: [],
         all: async (params?: any) => {
            const queryParams = new URLSearchParams();
            
            if (params) {
               if (params.page !== undefined) queryParams.append('page', params.page.toString());
               if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
               if (params.search !== undefined) queryParams.append('search', params.search);
               if (params.sort !== undefined) queryParams.append('sort', params.sort);
               if (params.order !== undefined) queryParams.append('order', params.order);
            }
            
            const queryString = queryParams.toString();
            const url = queryString ? `/example-rich?${queryString}` : '/example-rich';
            
            const response = await protectedApi.get(url);
            if (response.data.success && response.data.data) {
               set({ exampleRiches: response.data.data.example_riches || response.data.data });
            }
            return response.data;
         },
         detail: async ({ id }) => {
            const response = await protectedApi.get(`/example-rich/${id}`);
            return response.data;
         },
         add: async ({ data }) => {
            let payload: ExampleRichData | FormData = data;
            let config = {};

            // Jika ada field image yang instanceof File atau galleries yang merupakan array file, gunakan FormData
            if (data.image instanceof File || (data.galleries && Array.isArray(data.galleries) && data.galleries.some(gallery => gallery instanceof File))) {
               const formData = new FormData();

               // Mapping field satu per satu — aman dari TypeScript
               if (data.title) formData.append('title', data.title);
               if (data.slug) formData.append('slug', data.slug);
               if (data.description) formData.append('description', data.description);
               if (data.content) formData.append('content', data.content);
               if (data.image instanceof File) {
                  formData.append('image', data.image);
               }

               // Handle galleries
               if (data.galleries && Array.isArray(data.galleries)) {
                  // Filter hanya file yang merupakan instance File untuk dikirim ke backend
                  const fileGalleries = data.galleries.filter(gallery => gallery instanceof File);
                  fileGalleries.forEach((gallery, index) => {
                     if (gallery instanceof File) {
                        formData.append('galleries', gallery);
                     }
                  });
               }

               payload = formData;
               config = {
                  headers: {
                     'Content-Type': 'multipart/form-data',
                  },
               };
            } else {
               // Jika tidak ada file, konversi galleries dari array string ke JSON string
               if (data.galleries && Array.isArray(data.galleries)) {
                  // Hanya perlu mengonversi jika galleries adalah array (bukan string JSON)
                  const processedData = {
                     ...data,
                     galleries: JSON.stringify(data.galleries)
                  };
                  payload = processedData;
               }
            }

            const response = await protectedApi.post(`/example-rich`, payload, config);
            return response.data;
         },
         update: async ({ id, data }) => {
            let payload: ExampleRichData | FormData = data;
            let config = {};

            // Jika ada field image yang instanceof File atau galleries yang merupakan array file, gunakan FormData
            if (data.image instanceof File || (data.galleries && Array.isArray(data.galleries) && data.galleries.some(gallery => gallery instanceof File))) {
               const formData = new FormData();

               // Mapping field satu per satu — aman dari TypeScript
               if (data.title) formData.append('title', data.title);
               if (data.slug) formData.append('slug', data.slug);
               if (data.description) formData.append('description', data.description);
               if (data.content) formData.append('content', data.content);
               if (data.image instanceof File) {
                  formData.append('image', data.image);
               }

               // Handle galleries
               if (data.galleries && Array.isArray(data.galleries)) {
                  // Filter hanya file yang merupakan instance File untuk dikirim ke backend
                  const fileGalleries = data.galleries.filter(gallery => gallery instanceof File);
                  fileGalleries.forEach((gallery, index) => {
                     if (gallery instanceof File) {
                        formData.append('galleries', gallery);
                     }
                  });
               }

               payload = formData;
               config = {
                  headers: {
                     'Content-Type': 'multipart/form-data',
                  },
               };
            } else {
               // Jika tidak ada file, konversi galleries dari array string ke JSON string
               if (data.galleries && Array.isArray(data.galleries)) {
                  // Hanya perlu mengonversi jika galleries adalah array (bukan string JSON)
                  const processedData = {
                     ...data,
                     galleries: JSON.stringify(data.galleries)
                  };
                  payload = processedData;
               }
            }

            const response = await protectedApi.post(`/example-rich/${id}`, payload, config);
            return response.data;
         },
         delete: async ({ id }) => {
            const response = await protectedApi.delete(`/example-rich/${id}`);
            return response.data;
         },
      }),
      {
         name: 'example-rich-store', // key di localStorage
         partialize: (state) => ({
            exampleRiches: state.exampleRiches,
         }), // hanya simpan ini
      }
   )
);

export default useExampleRichStore;
