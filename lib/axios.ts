import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://85.31.238.112:3001";

const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 30000,
});

// 🔐 Ajout token uniquement côté navigateur
axiosInstance.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        if (process.env.NODE_ENV === "development") {
            console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        console.error("❌ [API] Erreur requête:", error);
        return Promise.reject(error);
    }
);

// 🔁 Gestion des réponses
axiosInstance.interceptors.response.use(
    (response) => {
        if (process.env.NODE_ENV === "development") {
            console.log(
                `📥 [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
            );
        }
        return response;
    },
    (error) => {
        if (typeof window !== "undefined") {
            // 401 → logout
            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                if (!window.location.pathname.includes("/login")) {
                    window.location.href = "/login";
                }
            }
        }

        if (error.response?.status === 403) {
            console.error("⛔ Accès interdit");
        }

        if (error.response?.status >= 500) {
            console.error(
                "🔥 Erreur serveur:",
                error.response?.data?.error || error.message
            );
        }

        if (process.env.NODE_ENV === "development") {
            console.error("❌ [API] Erreur réponse:", {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
            });
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;