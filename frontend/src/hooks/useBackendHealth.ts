import { useEffect, useState } from "react";
import api from "../services/api";

type BackendHealth = "checking" | "online" | "offline";

export function useBackendHealth(intervalMs = 30000) {
  const [status, setStatus] = useState<BackendHealth>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      const startedAt = performance.now();

      try {
        await api.get("/health");

        if (!cancelled) {
          setStatus("online");
          setLatencyMs(Math.round(performance.now() - startedAt));
        }
      } catch {
        if (!cancelled) {
          setStatus("offline");
          setLatencyMs(null);
        }
      }
    };

    checkHealth();
    const timer = window.setInterval(checkHealth, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return {
    status,
    latencyMs,
    isOnline: status === "online",
  };
}
