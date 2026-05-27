import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

console.log('🌐 Axios - API_URL:', API_URL);

const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if(token) {
            config.headers.authorization = `Bearer ${token}`;
        }
        console.log('📤 Requête sortante:', config.method?.toUpperCase(), config.baseURL + config.url);
        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosInstance;