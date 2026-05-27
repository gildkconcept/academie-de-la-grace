import axiosInstance from '@/lib/axios';

export const sessionService = {
  async generateCode(lat?: number, lng?: number, radius?: number, level?: number | null) {
    const response = await axiosInstance.post('/sessions/generate', { lat, lng, radius, level });
    return response.data;
  },

  async verifyCode(code: string, lat?: number, lng?: number) {
    const response = await axiosInstance.post('/sessions/verify', { code, lat, lng });
    return response.data;
  },

  async getActiveSessions() {
    const response = await axiosInstance.get('/sessions/active');
    return response.data;
  },

  async markAbsent(sessionId: string) {
    const response = await axiosInstance.post('/sessions/mark-absent', { sessionId });
    return response.data;
  },
};