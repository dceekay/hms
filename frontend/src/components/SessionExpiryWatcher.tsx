import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getMsUntilJwtExpiry, isJwtExpired } from "../utils/session";
import { endSession } from "../services/sessionManager";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function SessionExpiryWatcher() {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) return;

    const expireCurrentSession = () => {
      endSession();

      if (location.pathname !== "/login") {
        navigate("/login?session=expired", { replace: true });
      }
    };

    const checkCurrentToken = () => {
      const latestToken = typeof window !== "undefined" ? localStorage.getItem("hms_token") : token;

      if (isJwtExpired(latestToken, 0)) {
        expireCurrentSession();
      }
    };

    if (isJwtExpired(token, 0)) {
      expireCurrentSession();
      return;
    }

    const timeoutId = window.setTimeout(
      expireCurrentSession,
      Math.min(getMsUntilJwtExpiry(token), MAX_TIMEOUT_MS)
    );

    window.addEventListener("focus", checkCurrentToken);
    window.addEventListener("storage", checkCurrentToken);
    document.addEventListener("visibilitychange", checkCurrentToken);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", checkCurrentToken);
      window.removeEventListener("storage", checkCurrentToken);
      document.removeEventListener("visibilitychange", checkCurrentToken);
    };
  }, [location.pathname, navigate, token]);

  return null;
}
