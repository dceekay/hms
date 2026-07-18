import { create } from "zustand";
import { User } from "../types/auth";

const getInitialToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hms_token");
};

const getInitialUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("hms_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

type AuthState = {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("hms_token", token);
      } else {
        localStorage.removeItem("hms_token");
      }
    }
    set({ token });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("hms_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("hms_user");
      }
    }
    set({ user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hms_token");
      localStorage.removeItem("hms_user");
    }
    set({ token: null, user: null });
  },
}));
