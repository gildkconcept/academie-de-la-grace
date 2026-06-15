import axiosInstance from '@/lib/axios';

export interface LoginInput {
    username: string;
    password: string;
}

export interface RegisterInput {
    fullName: string;
    branch: string;
    level: string;
    serviceId: string;
    baptized: boolean | string;
    phone: string;
    username: string;
    password: string;
    maisonGrace?: string;
    profileImageUrl?: string;
}

export const authService = {
    async login(data: LoginInput) {
        try {
            const response = await axiosInstance.post('/auth/login', data);
            if (response.data.success) {
                localStorage.setItem('token', response.data.token);
            }
            return response.data;
        } catch (error: any) {
            // Gérer l'erreur 429 (trop de tentatives)
            if (error.response?.status === 429) {
                return {
                    success: false,
                    error: error.response.data.error,
                    blockedUntil: error.response.data.blockedUntil,
                    minutesLeft: error.response.data.minutesLeft
                };
            }
            // Gérer l'erreur 401 avec tentative restante
            if (error.response?.status === 401) {
                return {
                    success: false,
                    error: error.response.data.error,
                    attemptsLeft: error.response.data.attemptsLeft
                };
            }
            throw error;
        }
    },

    async register(data: RegisterInput) {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data;
    },

    async verify() {
        const response = await axiosInstance.get('/auth/verify');
        return response.data;
    },

    async logout() {
        localStorage.removeItem('token');
        return { success: true };
    },

    async checkUsername(username: string) {
        const response = await axiosInstance.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
        return response.data;
    },

    async verifyRecovery(data: { phone: string; fullName: string; branch: string; serviceId: string }) {
        const response = await axiosInstance.post('/auth/verify-recovery', data);
        return response.data;
    },

    async resetAccount(data: { recoveryToken: string; newUsername: string; newPassword: string }) {
        const response = await axiosInstance.post('/auth/reset-account', data);
        return response.data;
    }
};