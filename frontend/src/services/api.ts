import axios, { CanceledError } from "axios";
import { isJwtExpired } from "../utils/session";
import { queryClient, queryKeys } from "../lib/queryClient";
import { expireSession } from "./sessionManager";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;

  if (isJwtExpired(token)) {
    expireSession();
    return Promise.reject(new CanceledError("Session expired"));
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();

    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview });
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const hasStoredSession = typeof window !== "undefined" && Boolean(localStorage.getItem("hms_token"));
    const requestHadAuthHeader = Boolean(error?.config?.headers?.Authorization);
    const isAuthEndpoint = typeof error?.config?.url === "string" && error.config.url.includes("/auth/");

    if (status === 401 && !isAuthEndpoint && (hasStoredSession || requestHadAuthHeader)) {
      expireSession();
    }

    return Promise.reject(error);
  }
);

export default api;
