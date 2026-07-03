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

  // ✅ NOUVEAU - Récupérer l'historique des sessions (pour superadmin avec filtres)
  async getAdminSessionHistory(limit = 50, offset = 0, filters?: { level?: string; date?: string }) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.date) params.append('date', filters.date);
    
    const response = await axiosInstance.get(`/sessions/admin-history?${params.toString()}`);
    return response.data;
  },

  // ✅ NOUVEAU - Récupérer l'historique simple (pour compatibilité)
  async getSessionHistory(limit = 20, offset = 0) {
    const response = await axiosInstance.get(`/sessions/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};