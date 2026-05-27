import axiosInstance from '@/lib/axios';

export const rankingService = {
  async getRankings(filters?: { level?: string; serviceId?: string; branch?: string }) {
    const params = new URLSearchParams(filters).toString();
    const response = await axiosInstance.get(`/rankings/fair${params ? `?${params}` : ''}`);
    return response.data;
  },
};