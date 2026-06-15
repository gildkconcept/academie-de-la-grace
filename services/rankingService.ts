import axiosInstance from '@/lib/axios';

export interface RankingFilters {
  level?: string;
  serviceId?: string;
  branch?: string;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface RankingStudent {
  id: string;
  rank: number;
  final_score: number;
  attendance_score: number;
  quiz_score: number;
  missed_quizzes?: number;
  missed_sessions?: number;
  total_quizzes_expected?: number;
  total_sessions_expected?: number;
  student: {
    id: string;
    full_name: string;
    username: string;
    profile_image_url: string | null;
    branch: string;
    level: number;
    service_id: string | null;
    service_name: string;
    baptized: boolean;
  };
}

export interface RankingStats {
  totalStudents: number;
  averageScore: number;
  topStudent: RankingStudent | null;
  totalStudentsWithMissedQuizzes: number;
  totalStudentsWithMissedSessions: number;
}

export const rankingService = {
  /**
   * Récupérer le classement équitable (prend en compte l'ancienneté)
   */
  async getFairRanking(filters?: RankingFilters): Promise<{ rankings: RankingStudent[]; stats: RankingStats; isFair: boolean }> {
    const params = new URLSearchParams();
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    
    const response = await axiosInstance.get(`/rankings/fair${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Récupérer le classement simple
   */
  async getSimpleRanking(filters?: RankingFilters): Promise<{ rankings: RankingStudent[]; stats: RankingStats }> {
    const params = new URLSearchParams();
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    if (filters?.period && filters.period !== 'all') params.append('period', filters.period);
    
    const response = await axiosInstance.get(`/rankings${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Récupérer le classement par niveau
   */
  async getRankingsByLevel(level: number, filters?: Omit<RankingFilters, 'level'>) {
    const params = new URLSearchParams();
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    
    const response = await axiosInstance.get(`/rankings/level/${level}${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Récupérer le classement d'un étudiant spécifique
   */
  async getStudentRanking(studentId: string, fair = true) {
    const response = await axiosInstance.get(`/rankings/student/${studentId}?fair=${fair}`);
    return response.data;
  },
};