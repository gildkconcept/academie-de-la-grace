import axiosInstance from '@/lib/axios';

export const verseService = {
  async getToday() {
    const response = await axiosInstance.get('/verses/today');
    return response.data;
  },

  async getAll() {
    const response = await axiosInstance.get('/admin/verses');
    return response.data;
  },

  async create(data: { verse: string; reference: string; displayed_date: string }) {
    const response = await axiosInstance.post('/admin/verses', data);
    return response.data;
  },

  async update(id: string, data: { verse: string; reference: string; displayed_date: string; is_active: boolean }) {
    const response = await axiosInstance.put(`/admin/verses?id=${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await axiosInstance.delete(`/admin/verses?id=${id}`);
    return response.data;
  },
};