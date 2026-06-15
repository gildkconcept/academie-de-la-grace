// services/attendanceService.ts
import axiosInstance from '@/lib/axios';

export const attendanceService = {
  async verifyCode(code: string, lat?: number, lng?: number) {
    const response = await axiosInstance.post('/sessions/verify', { code, lat, lng });
    return response.data;
  },

  async generateCode(lat?: number, lng?: number, radius?: number, level?: number | null) {
    const response = await axiosInstance.post('/sessions/generate', { lat, lng, radius, level });
    return response.data;
  },

  async markServiceAttendance(sessionId: string, attendances: { studentId: string; status: string }[]) {
    const response = await axiosInstance.post('/service/attendance/mark', { sessionId, attendances });
    return response.data;
  },

  async getCurrentSession() {
    const response = await axiosInstance.get('/service/session/current');
    return response.data;
  },

  async startServiceSession(date: string, type: string) {
    const response = await axiosInstance.post('/service/session/start', { date, type });
    return response.data;
  },

  // ✅ CORRIGÉ - URL modifiée de '/service/session/history' vers '/sessions/history'
  async getSessionHistory(limit = 20, offset = 0) {
    const response = await axiosInstance.get(`/sessions/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // ✅ NOUVELLE MÉTHODE - Récupérer toutes les sessions (pour superadmin)
  async getAllSessionsHistory(limit = 50, offset = 0) {
    const response = await axiosInstance.get(`/sessions/all-history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getSessionStudents(sessionId: string) {
    const response = await axiosInstance.get(`/service/session/get?sessionId=${sessionId}`);
    return response.data;
  },

  // Méthodes pour le superadmin
  async getServiceAttendance(date: string, serviceId?: string, type?: string) {
    let url = `/service/attendance/all?date=${date}`;
    if (serviceId && serviceId !== 'all') url += `&serviceId=${serviceId}`;
    if (type && type !== 'all') url += `&type=${type}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  async getStatsGlobal() {
    const response = await axiosInstance.get('/stats/global');
    return response.data;
  },

  async getSessionTypes() {
    const response = await axiosInstance.get('/session-types');
    return response.data;
  },

  async getServiceSessionsHistory(limit = 20, offset = 0) {
    const response = await axiosInstance.get(`/service-sessions/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // ⚠️ MÉTHODES POUR MonthlyReports
  async getServices() {
    const response = await axiosInstance.get('/services');
    return response.data;
  },

  async getBranches() {
    // Récupérer les branches uniques depuis les étudiants
    const response = await axiosInstance.get('/students/branches');
    return response.data;
  },

  async getMonthlyReport(params: URLSearchParams) {
    const response = await axiosInstance.get(`/reports/monthly?${params}`);
    return response.data;
  },
};