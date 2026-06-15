// services/chatService.ts
import axiosInstance from '@/lib/axios';

export interface ChatGroup {
  id: string;
  name: string;
  type: string;
  branch?: string;
  level?: number;
  service_id?: string;
  memberCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    senderId: string;
    senderType: string;
    senderAvatar?: string;
    time: string;
  };
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: string;
  sender_avatar?: string;
  content: string;
  type: string;
  reply_to: string | null;
  reply_to_message?: ChatMessage | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export const chatService = {
  // ==================== GROUPES ====================
  
  /**
   * Récupérer les groupes de discussion de l'utilisateur
   */
  async getGroups(): Promise<{ groups: ChatGroup[] }> {
    const response = await axiosInstance.get('/chat/groups');
    return response.data;
  },

  /**
   * Créer un nouveau groupe (superadmin uniquement)
   */
  async createGroup(data: {
    name: string;
    type: 'branch' | 'level' | 'service' | 'special';
    branch?: string;
    level?: number;
    service_id?: string;
    memberIds?: string[];
  }) {
    const response = await axiosInstance.post('/chat/groups', data);
    return response.data;
  },

  // ==================== MESSAGES ====================

  /**
   * Récupérer les messages d'un groupe
   */
  async getMessages(groupId: string, limit = 50, before?: string): Promise<{ messages: ChatMessage[] }> {
    let url = `/chat/messages?groupId=${groupId}&limit=${limit}`;
    if (before) url += `&before=${before}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  /**
   * Envoyer un message dans un groupe
   */
  async sendMessage(groupId: string, content: string, replyTo?: string, type = 'text') {
    const response = await axiosInstance.post('/chat/messages', { groupId, content, replyTo, type });
    return response.data;
  },

  /**
   * Modifier un message (seulement par l'auteur)
   */
  async editMessage(messageId: string, content: string) {
    const response = await axiosInstance.put('/chat/messages', { messageId, content });
    return response.data;
  },

  /**
   * Supprimer un message (soft delete)
   */
  async deleteMessage(messageId: string) {
    const response = await axiosInstance.delete(`/chat/messages?messageId=${messageId}`);
    return response.data;
  },

  // ==================== STATUT DE LECTURE ====================

  /**
   * Marquer tous les messages d'un groupe comme lus
   */
  async markAsRead(groupId: string) {
    const response = await axiosInstance.post('/chat/mark-read', { groupId });
    return response.data;
  },

  // ==================== MEMBRES ====================

  /**
   * Récupérer les membres d'un groupe
   */
  async getGroupMembers(groupId: string) {
    const response = await axiosInstance.get(`/chat/groups/${groupId}/members`);
    return response.data;
  },

  /**
   * Ajouter des membres à un groupe (superadmin uniquement)
   */
  async addMembers(groupId: string, memberIds: string[]) {
    const response = await axiosInstance.post(`/chat/groups/${groupId}/members`, { memberIds });
    return response.data;
  },

  /**
   * Quitter un groupe
   */
  async leaveGroup(groupId: string) {
    const response = await axiosInstance.post(`/chat/groups/${groupId}/leave`);
    return response.data;
  },
};