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

  // ==================== NOUVELLES MÉTHODES POUR LES ANNONCES ====================

  /**
   * Envoyer une annonce à tous les étudiants
   * Nécessite le rôle superadmin
   */
  async announceToAll(title: string, message: string, type = 'announcement', link?: string) {
    const response = await axiosInstance.post('/notifications/announcement/all', { title, message, type, link });
    return response.data;
  },

  /**
   * Envoyer une annonce à un service spécifique
   * Nécessite le rôle superadmin
   */
  async announceToService(serviceId: string, title: string, message: string, type = 'announcement', link?: string) {
    const response = await axiosInstance.post(`/notifications/announcement/service/${serviceId}`, { title, message, type, link });
    return response.data;
  },

  /**
   * Envoyer une annonce par niveau
   * Nécessite le rôle superadmin
   */
  async announceToLevel(level: number, title: string, message: string, type = 'announcement', link?: string) {
    const response = await axiosInstance.post(`/notifications/announcement/level/${level}`, { title, message, type, link });
    return response.data;
  },

  /**
   * Récupérer toutes les notifications (pour superadmin)
   */
  async getAllNotifications(limit = 100, offset = 0) {
    const response = await axiosInstance.get(`/notifications/all?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};