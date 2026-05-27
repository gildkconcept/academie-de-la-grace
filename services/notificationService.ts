import axiosInstance from '@/lib/axios';

export const notificationService = {
  async getAll(limit = 50, unreadOnly = false) {
    const url = `/notifications?limit=${limit}${unreadOnly ? '&unread=true' : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  async markAsRead(id: string) {
    const response = await axiosInstance.patch(`/notifications/${id}`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await axiosInstance.patch('/notifications/read-all');
    return response.data;
  },

  async delete(id: string) {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
  },

  async create(data: { userIds: string[]; title: string; message: string; type: string; link?: string }) {
    const response = await axiosInstance.post('/notifications', data);
    return response.data;
  },
};