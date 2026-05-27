import axiosInstance from '../app/../lib/axios';
import { LoginInput, RegisterInput } from '@/lib/validators'

export const authService = {
  async login(data: LoginInput) {
  
    const response = await axiosInstance.post('/auth/login', data);
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
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