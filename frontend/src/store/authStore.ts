import { create } from "zustand";
import type { User } from "../types/auth";

const ACCESS_TOKEN_KEY = "hms_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const USER_KEY = "hms_user";

const clearStoredSession = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getInitialToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getInitialRefreshToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const getInitialUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  refreshToken: getInitialRefreshToken(),
  user: getInitialUser(),
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
    set({ token });
  },
  setRefreshToken: (refreshToken) => {
    if (typeof window !== "undefined") {
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
    set({ refreshToken });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
    set({ user });
  },
  logout: () => {
    clearStoredSession();
    set({ token: null, refreshToken: null, user: null });
  },
}));
