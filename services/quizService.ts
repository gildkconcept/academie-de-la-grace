import axiosInstance from '@/lib/axios';

export const quizService = {
  async getAll() {
    const response = await axiosInstance.get('/quizzes');
    return response.data;
  },

  async getById(id: string) {
    const response = await axiosInstance.get(`/quizzes/${id}`);
    return response.data;
  },

  async submit(id: string, answers: Record<string, string>) {
    const response = await axiosInstance.post(`/quizzes/${id}/submit`, { answers });
    return response.data;
  },

  async getMyResults() {
    const response = await axiosInstance.get('/quizzes/my-results');
    return response.data;
  },

  async getAllResults(quizId?: string, level?: string) {
    let url = '/quiz-results?';
    if (quizId && quizId !== 'all') url += `quizId=${quizId}&`;
    if (level && level !== 'all') url += `level=${level}&`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // ✅ CORRIGÉ - Utilise /quizzes/history au lieu de /quiz/history
  async getHistory(filters?: {
    limit?: number;
    offset?: number;
    level?: string;
    serviceId?: string;
    branch?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await axiosInstance.get(`/quizzes/history${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  // ✅ CORRIGÉ - Utilise /quizzes/detail au lieu de /quiz/detail
  async getDetail(resultId: string) {
    const response = await axiosInstance.get(`/quizzes/detail?resultId=${resultId}`);
    return response.data;
  },
};