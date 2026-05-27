import axiosInstance from '@/lib/axios';

export const studentService = {
  async getAll(filters?: { serviceId?: string; level?: string; branch?: string }) {
    const params = new URLSearchParams(filters).toString();
    const response = await axiosInstance.get(`/students${params ? `?${params}` : ''}`);
    return response.data;
  },

  async getById(id: string) {
    const response = await axiosInstance.get(`/students/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await axiosInstance.post('/students', data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await axiosInstance.put(`/students/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await axiosInstance.delete(`/students/${id}`);
    return response.data;
  },

  async updateLevel(id: string, level: number, reason?: string) {
    const response = await axiosInstance.put(`/students/${id}/level`, { level, reason });
    return response.data;
  },

  async bulkPromote(studentIds: string[], targetLevel: number, reason?: string) {
    const response = await axiosInstance.post('/students/bulk-promote', { studentIds, targetLevel, reason });
    return response.data;
  },
};