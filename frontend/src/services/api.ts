import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { isJwtExpired } from "../utils/session";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;

  if (isJwtExpired(token)) {
    useAuthStore.getState().logout();

    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login?session=expired");
    }

    return config;
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasSession = typeof window !== "undefined" && Boolean(localStorage.getItem("hms_token"));

    if (status === 401 && hasSession) {
      useAuthStore.getState().logout();

      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login?session=expired");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
