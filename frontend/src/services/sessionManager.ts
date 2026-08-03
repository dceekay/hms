import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../store/authStore";

const EXPIRED_SESSION_PATH = "/login?session=expired";

export function clearSessionCache() {
  queryClient.clear();
}

export function endSession() {
  useAuthStore.getState().logout();
  clearSessionCache();
}

export function redirectToExpiredSession() {
  if (typeof window === "undefined") return;

  if (window.location.pathname !== "/login") {
    window.location.assign(EXPIRED_SESSION_PATH);
  }
}

export function expireSession() {
  endSession();
  redirectToExpiredSession();
}
