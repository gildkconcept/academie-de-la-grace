import axiosInstance from '../lib/axios';

export const serviceService = {
    async getAll() {
        const response = await axiosInstance.get('/services');
        return response.data;
    },
};