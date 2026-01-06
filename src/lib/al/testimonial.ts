import { protectedApi } from './axios';
import { CONFIG } from 'src/global-config';
import { TestimonialItem, TestimonialSchema } from 'src/types/testimonial';

// Use the protected API instance that handles auth tokens and refresh automatically
const testimonialApi = protectedApi;

export const testimonialService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }) => {
    try {
      const response = await testimonialApi.get('/testimonials', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch testimonials',
      };
    }
 },

  get: async (id: string) => {
    try {
      const response = await testimonialApi.get(`/testimonials/${id}`);
      return {
        success: true,
        data: response.data as TestimonialItem,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch testimonial',
      };
    }
  },

  create: async (data: TestimonialSchema) => {
    try {
      const formData = new FormData();
      
      // Append regular fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value) && key === 'galleries') {
            // Handle multiple gallery files
            value.forEach((file) => {
              if (file instanceof File) {
                formData.append('galleries', file);
              }
            });
          } else if (value instanceof File) {
            // Handle single file (image)
            formData.append(key, value);
          } else if (typeof value === 'string' || typeof value === 'number') {
            formData.append(key, value.toString());
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          }
        }
      });

      const response = await testimonialApi.post('/testimonials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data as TestimonialItem,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to create testimonial',
      };
    }
  },

  update: async (id: string, data: Partial<TestimonialSchema>) => {
    try {
      const formData = new FormData();
      
      // Append regular fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value) && key === 'galleries') {
            // Handle multiple gallery files
            value.forEach((file) => {
              if (file instanceof File) {
                formData.append('galleries', file);
              }
            });
          } else if (value instanceof File) {
            // Handle single file (image)
            formData.append(key, value);
          } else if (typeof value === 'string' || typeof value === 'number') {
            formData.append(key, value.toString());
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          }
        }
      });

      const response = await testimonialApi.post(`/testimonials/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data as TestimonialItem,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update testimonial',
      };
    }
  },

  delete: async (id: string) => {
    try {
      await testimonialApi.delete(`/testimonials/${id}`);
      return {
        success: true,
        message: 'Testimonial deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to delete testimonial',
      };
    }
 },
};
