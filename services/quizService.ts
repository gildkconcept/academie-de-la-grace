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

  async getHistory(limit = 50, offset = 0, filters?: any) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString(), ...filters }).toString();
    const response = await axiosInstance.get(`/quiz/history?${params}`);
    return response.data;
  },

  async getDetail(resultId: string) {
    const response = await axiosInstance.get(`/quiz/detail?resultId=${resultId}`);
    return response.data;
  },
};