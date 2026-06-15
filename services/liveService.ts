// services/liveService.ts
import axiosInstance from '@/lib/axios';

export interface OnlineUser {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  profile_image_url: string | null;
  service_id: string | null;
  service_name: string | null;
  level: number | null;
  branch: string | null;
  is_online: boolean;
  connected_at: string;
  last_seen: string;
  connected_duration: string | null;
  last_seen_formatted: string;
  current_page: string | null;
}

export interface OnlineUsersStats {
  totalOnline: number;
  studentsOnline: number;
  managersOnline: number;
  mostActiveService: string | null;
}

export const liveService = {
  /**
   * Envoyer un heartbeat pour maintenir la session active
   * À appeler régulièrement (toutes les 2-3 minutes)
   */
  async sendHeartbeat(currentPage?: string): Promise<{ success: boolean; timestamp: string }> {
    const response = await axiosInstance.post('/live/heartbeat', { currentPage });
    return response.data;
  },

  /**
   * Récupérer la liste des utilisateurs en ligne
   */
  async getOnlineUsers(filters?: {
    role?: string;        // 'superadmin' | 'service_manager' | 'student'
    serviceId?: string;
    level?: string;       // '1' | '2' | '3'
    branch?: string;
    status?: 'online' | 'offline' | 'all';
  }): Promise<{ users: OnlineUser[]; stats: OnlineUsersStats; lastUpdate: string }> {
    const params = new URLSearchParams();
    if (filters?.role && filters.role !== 'all') params.append('role', filters.role);
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    
    const response = await axiosInstance.get(`/live/online-users${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Déconnecter manuellement un utilisateur (superadmin uniquement)
   */
  async disconnectUser(userId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.post(`/live/disconnect/${userId}`);
    return response.data;
  },

  /**
   * Récupérer les statistiques de connexion (superadmin uniquement)
   */
  async getConnectionStats(period: 'day' | 'week' | 'month' = 'day'): Promise<{
    period: string;
    total: number;
    byRole: { superadmin: number; service_manager: number; student: number };
    averagePerDay: number;
  }> {
    const response = await axiosInstance.get(`/live/stats?period=${period}`);
    return response.data;
  },
};