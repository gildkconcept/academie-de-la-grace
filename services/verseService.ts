import axiosInstance from '@/lib/axios';

export interface DailyVerse {
  id: number;
  verse: string;
  reference: string;
  displayed_date: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface CreateVerseData {
  verse: string;
  reference: string;
  displayed_date: string;
  is_active?: boolean;
}

export const verseService = {
  /**
   * Récupérer le verset du jour
   * Accessible à tous les utilisateurs (route publique)
   */
  async getToday(): Promise<{ verse: DailyVerse | null }> {
    try {
      // Utiliser l'API via Next.js rewrite (ne pas mettre l'URL complète du backend)
      const response = await fetch('/api/verses/today', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Erreur chargement verset:', response.status);
        return { verse: null };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur chargement verset:', error);
      return { verse: null };
    }
  },

  /**
   * Récupérer tous les versets (superadmin uniquement)
   */
  async getAll(): Promise<DailyVerse[]> {
    const response = await axiosInstance.get('/verses');
    return response.data;
  },

  /**
   * Créer un nouveau verset (superadmin uniquement)
   */
  async create(data: CreateVerseData): Promise<DailyVerse> {
    const response = await axiosInstance.post('/verses', data);
    return response.data;
  },

  /**
   * Modifier un verset (superadmin uniquement)
   */
  async update(id: string, data: Partial<CreateVerseData> & { is_active?: boolean }): Promise<DailyVerse> {
    const response = await axiosInstance.put(`/verses/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un verset (superadmin uniquement)
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/verses/${id}`);
    return response.data;
  },

  /**
   * Récupérer les versets par date (superadmin uniquement)
   */
  async getByDate(date: string): Promise<DailyVerse | null> {
    const response = await axiosInstance.get(`/verses/date/${date}`);
    return response.data;
  },
};