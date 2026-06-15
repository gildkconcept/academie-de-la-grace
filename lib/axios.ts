import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'x-api-key': API_KEY || '',
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 30000, // 30 secondes timeout
});

// Intercepteur pour ajouter le token d'authentification
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log optionnel en développement
        if (process.env.NODE_ENV === 'development') {
            console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
    },
    (error) => {
        console.error('❌ [API] Erreur requête:', error);
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer les erreurs
axiosInstance.interceptors.response.use(
    (response) => {
        // Log optionnel en développement
        if (process.env.NODE_ENV === 'development') {
            console.log(`📥 [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        }
        return response;
    },
    (error) => {
        // Gérer les erreurs 401 (non authentifié)
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        
        // Gérer les erreurs 403 (interdit)
        if (error.response?.status === 403) {
            console.error('⛔ Accès interdit');
            // Optionnel: afficher une notification
        }
        
        // Gérer les erreurs 500 (serveur)
        if (error.response?.status >= 500) {
            console.error('🔥 Erreur serveur:', error.response?.data?.error || error.message);
        }
        
        // Log l'erreur en développement
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ [API] Erreur réponse:', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                message: error.response?.data?.error || error.message
            });
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;