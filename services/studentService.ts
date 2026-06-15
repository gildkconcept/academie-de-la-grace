import axiosInstance from '@/lib/axios';

export interface StudentFilters {
  serviceId?: string;
  level?: string;
  branch?: string;
}

export interface CreateStudentData {
  fullName: string;
  username: string;
  branch: string;
  level: string;
  baptized: boolean | string;
  phone?: string;
  password: string;
  serviceId: string;
  maisonGrace?: string;
  profileImageUrl?: string;
}

export interface CreateNoPhoneData {
  fullName: string;
  branch: string;
  level: string;
  serviceId: string;
  baptized: boolean | string;
  maisonGrace?: string;
  profileImageUrl?: string;
}

export const studentService = {
  // ==================== MÉTHODES EXISTANTES ====================
  
  async getAll(filters?: StudentFilters) {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.branch) params.append('branch', filters.branch);
    
    const response = await axiosInstance.get(`/students${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  async getById(id: string) {
    const response = await axiosInstance.get(`/students/${id}`);
    return response.data;
  },

  async create(data: CreateStudentData) {
    const response = await axiosInstance.post('/students', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateStudentData>) {
    const response = await axiosInstance.put(`/students/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await axiosInstance.delete(`/students/${id}`);
    return response.data;
  },

  async updateLevel(id: string, level: number, reason?: string) {
    const response = await axiosInstance.put(`/students/${id}/level`, { level, reason });
    return response.data;
  },

  async bulkPromote(studentIds: string[], targetLevel: number, reason?: string) {
    const response = await axiosInstance.post('/students/bulk-promote', { studentIds, targetLevel, reason });
    return response.data;
  },

  // ==================== NOUVELLES MÉTHODES ====================

  /**
   * Récupérer les étudiants supprimés (soft delete)
   * Nécessite le rôle superadmin
   */
  async getDeleted() {
    const response = await axiosInstance.get('/students/deleted');
    return response.data;
  },

  /**
   * Restaurer un étudiant supprimé
   * Nécessite le rôle superadmin
   */
  async restore(id: string) {
    const response = await axiosInstance.post(`/students/${id}/restore`);
    return response.data;
  },

  /**
   * Récupérer les statistiques des étudiants sans téléphone
   * Nécessite le rôle superadmin
   */
  async getNoPhoneStats() {
    const response = await axiosInstance.get('/students/no-phone-stats');
    return response.data;
  },

  /**
   * Créer un étudiant sans téléphone
   * Nécessite le rôle superadmin
   */
  async createNoPhone(data: CreateNoPhoneData) {
    const response = await axiosInstance.post('/students/create-no-phone', data);
    return response.data;
  },

  /**
   * Récupérer tous les IDs des étudiants (pour les notifications)
   * Nécessite le rôle superadmin
   */
  async getAllIds() {
    const response = await axiosInstance.get('/students/all-ids');
    return response.data;
  },

  /**
   * Récupérer les IDs des étudiants d'un service spécifique
   * Nécessite le rôle superadmin
   */
  async getByService(serviceId: string) {
    const response = await axiosInstance.get(`/students/by-service?serviceId=${serviceId}`);
    return response.data;
  },

  /**
   * Récupérer les IDs des étudiants d'un niveau spécifique
   * Nécessite le rôle superadmin
   */
  async getByLevel(level: string) {
    const response = await axiosInstance.get(`/students/by-level?level=${level}`);
    return response.data;
  },

  /**
   * Récupérer la liste des branches uniques
   * Accessible à tous les utilisateurs authentifiés
   */
  async getBranches() {
    const response = await axiosInstance.get('/students/branches');
    return response.data;
  },

  /**
   * Récupérer les étudiants avec leurs statistiques de présence
   * Pour les rapports et classements
   */
  async getWithStats(filters?: StudentFilters) {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.branch) params.append('branch', filters.branch);
    
    const response = await axiosInstance.get(`/students/with-stats${params.toString() ? `?${params}` : ''}`);
    return response.data;
  }
};