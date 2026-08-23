import axios, { CanceledError } from "axios";
import { isJwtExpired } from "../utils/session";
import { queryClient, queryKeys } from "../lib/queryClient";
import { expireSession } from "./sessionManager";
import { notifyDataMutated } from "../utils/appEvents";
import { refreshStoredAccessToken } from "./tokenRefresh";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

function isAuthEndpoint(url?: string) {
  return typeof url === "string" && url.includes("/auth/");
}

api.interceptors.request.use(async (config) => {
  let token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;
  const authEndpoint = isAuthEndpoint(config.url);

  if (!authEndpoint && isJwtExpired(token)) {
    token = await refreshStoredAccessToken();

    if (!token) {
      expireSession();
      return Promise.reject(new CanceledError("Session expired"));
    }
  }

  if (!authEndpoint && token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();

    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview });
      notifyDataMutated({
        method,
        url: response.config.url,
        source: "api",
      });
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const hasStoredSession =
      typeof window !== "undefined" &&
      (Boolean(localStorage.getItem("hms_token")) || Boolean(localStorage.getItem("hms_refresh_token")));
    const requestHadAuthHeader = Boolean(error?.config?.headers?.Authorization);
    const authEndpoint = isAuthEndpoint(error?.config?.url);

    if (status === 401 && !authEndpoint && (hasStoredSession || requestHadAuthHeader)) {
      expireSession();
    }

    return Promise.reject(error);
  }
);

export default api;
