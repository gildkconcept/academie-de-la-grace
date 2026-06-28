// services/whatsappService.ts
import axiosInstance from '@/lib/axios';

export interface WhatsAppMessage {
  message: string;
  recipients: string[];
  includeAll?: boolean;
  serviceId?: string;
  level?: number;
  fromNumber?: string; // ✅ AJOUTÉ - Numéro de l'expéditeur (optionnel)
}

export const whatsappService = {
  // ✅ Numéro par défaut de l'expéditeur (Académie de la Grâce)
  DEFAULT_FROM_NUMBER: '2250544043866',

  // ✅ Numéro formaté pour l'affichage
  FROM_NUMBER_DISPLAY: '0544043866',

  /**
   * Nettoyer un numéro de téléphone
   */
  cleanPhone(phone: string): string {
    // Enlever tous les caractères non numériques
    let cleaned = phone.replace(/[^0-9]/g, '');
    
    // Si le numéro commence par 0, le remplacer par 225 (Côte d'Ivoire)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Si le numéro ne commence pas par 225, l'ajouter
    if (!cleaned.startsWith('225')) {
      cleaned = `225${cleaned}`;
    }
    
    return cleaned;
  },

  /**
   * Récupérer les numéros de téléphone des étudiants
   */
  async getStudentPhones(filters?: {
    serviceId?: string;
    level?: string;
    branch?: string;
    baptized?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.serviceId && filters.serviceId !== 'all') params.append('serviceId', filters.serviceId);
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    if (filters?.baptized !== undefined) params.append('baptized', String(filters.baptized));
    
    const response = await axiosInstance.get(`/whatsapp/students${params.toString() ? `?${params}` : ''}`);
    return response.data;
  },

  /**
   * Envoyer un message WhatsApp (génère les liens)
   */
  async sendMessage(data: WhatsAppMessage) {
    // Ajouter le numéro de l'expéditeur par défaut si non fourni
    const payload = {
      ...data,
      fromNumber: data.fromNumber || this.DEFAULT_FROM_NUMBER
    };
    const response = await axiosInstance.post('/whatsapp/send', payload);
    return response.data;
  },

  /**
   * Générer un lien WhatsApp pour un numéro
   * @param phone - Numéro du destinataire
   * @param message - Message à envoyer
   * @param fromNumber - Numéro de l'expéditeur (optionnel)
   */
  generateWhatsAppLink(phone: string, message: string, fromNumber?: string): string {
    // Nettoyer le numéro du destinataire
    const cleanPhone = this.cleanPhone(phone);
    
    // Ajouter un préfixe indiquant l'expéditeur
    const senderDisplay = fromNumber 
      ? this.cleanPhone(fromNumber).replace(/^225/, '0')
      : this.FROM_NUMBER_DISPLAY;
    
    // Message avec en-tête indiquant l'expéditeur
    const fullMessage = `📩 Message de l'Académie de la Grâce (${senderDisplay})\n\n${message}\n\n---\n📌 Ce message est un envoi automatique.`;
    
    const encodedMessage = encodeURIComponent(fullMessage);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  },

  /**
   * Générer des liens WhatsApp pour plusieurs numéros
   */
  generateBulkWhatsAppLinks(phones: string[], message: string, fromNumber?: string): string[] {
    return phones.map(phone => this.generateWhatsAppLink(phone, message, fromNumber));
  },

  /**
   * Vérifier si un numéro est valide
   */
  isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[^0-9]/g, '');
    // Le numéro doit avoir au moins 8 chiffres (format ivoirien)
    return cleaned.length >= 8 && cleaned.length <= 13;
  },

  /**
   * Formater un numéro pour l'affichage
   */
  formatPhoneDisplay(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    // Format ivoirien : 05 44 04 38 66
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    // Format international : +225 05 44 04 38 66
    if (cleaned.startsWith('225') && cleaned.length === 12) {
      const local = cleaned.substring(3);
      return `+${cleaned.substring(0, 3)} ${local.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
    }
    return cleaned;
  }
};