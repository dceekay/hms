import axios from "axios";
import { useAuthStore } from "../store/authStore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type RefreshResponse = {
  accessToken: string;
};

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hms_refresh_token");
}

export function hasRefreshSession() {
  return Boolean(getStoredRefreshToken());
}

export async function refreshStoredAccessToken() {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiResponse<RefreshResponse>>("/auth/refresh", { refreshToken })
      .then((response) => {
        const accessToken = response.data.data?.accessToken;

        if (!accessToken) {
          return null;
        }

        useAuthStore.getState().setToken(accessToken);
        return accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
