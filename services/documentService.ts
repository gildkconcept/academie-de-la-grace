// services/documentService.ts
import axiosInstance from '@/lib/axios';

export interface Document {
    id: string;
    title: string;
    description: string;
    file_url: string;
    file_name: string;
    file_size: number;
    cover_image_url: string | null;
    level: number | null;
    branch: string | null;
    service_id: string | null;
    is_visible: boolean;
    is_downloadable: boolean;
    download_count: number;
    view_count: number;
    created_at: string;
    created_by: string;
    creator_name?: string;
    services?: { name: string };
}

export const documentService = {
    // Récupérer tous les documents (superadmin)
    async getAll(filters?: {
        level?: string;
        branch?: string;
        serviceId?: string;
        search?: string;
        isVisible?: boolean;
    }) {
        const params = new URLSearchParams();
        if (filters?.level) params.append('level', filters.level);
        if (filters?.branch) params.append('branch', filters.branch);
        if (filters?.serviceId) params.append('serviceId', filters.serviceId);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.isVisible !== undefined) params.append('isVisible', String(filters.isVisible));

        const response = await axiosInstance.get(`/documents${params.toString() ? `?${params}` : ''}`);
        return response.data;
    },

    // Récupérer les documents d'un étudiant
    async getStudentDocuments() {
        const response = await axiosInstance.get('/documents/student');
        return response.data;
    },

    // Récupérer un document par son ID
    async getById(id: string) {
        const response = await axiosInstance.get(`/documents/${id}`);
        return response.data;
    },

    // Créer un document (superadmin)
    async create(data: FormData) {
        const response = await axiosInstance.post('/documents', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Mettre à jour un document (superadmin)
    async update(id: string, data: FormData) {
        const response = await axiosInstance.put(`/documents/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Supprimer un document (superadmin)
    async delete(id: string) {
        const response = await axiosInstance.delete(`/documents/${id}`);
        return response.data;
    },

    // Télécharger un document (étudiant)
    async download(id: string) {
        const response = await axiosInstance.post(`/documents/${id}/download`);
        return response.data;
    },

    // Enregistrer une vue (étudiant)
    async view(id: string) {
        const response = await axiosInstance.post(`/documents/${id}/view`);
        return response.data;
    },

    // Upload d'un fichier (superadmin)
    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axiosInstance.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Récupérer les statistiques (superadmin)
    async getStats() {
        const response = await axiosInstance.get('/documents/stats');
        return response.data;
    },

    // Récupérer les téléchargements d'un document (superadmin)
    async getDownloads(documentId: string) {
        const response = await axiosInstance.get(`/documents/${documentId}/downloads`);
        return response.data;
    }
};