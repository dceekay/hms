import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { HMS_NETWORK_STATUS_CHANGED_EVENT } from "../utils/appEvents";

export type BackendHealth = "online" | "slow" | "offline" | "server-offline" | "checking";

const SLOW_LATENCY_THRESHOLD_MS = 800;

export function useBackendHealth(intervalMs = 30000) {
  const [status, setStatus] = useState<BackendHealth>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    return "checking";
  });
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const isCheckingRef = useRef(false);

  const checkHealth = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setLatencyMs(null);
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const startedAt = performance.now();

    try {
      // Direct health probe with cache-busting timestamp
      await api.get(`/health?_t=${Date.now()}`, {
        timeout: 10000,
      });

      const elapsed = Math.round(performance.now() - startedAt);
      setLatencyMs(elapsed);

      if (elapsed > SLOW_LATENCY_THRESHOLD_MS) {
        setStatus("slow");
      } else {
        setStatus("online");
      }
    } catch {
      // If browser has internet but API fails, it's server-offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
      } else {
        setStatus("server-offline");
      }
      setLatencyMs(null);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void checkHealth();

    const handleBrowserOnline = () => {
      setStatus("checking");
      void checkHealth();
    };

    const handleBrowserOffline = () => {
      setStatus("offline");
      setLatencyMs(null);
    };

    const handleNetworkStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOnline?: boolean; isServerError?: boolean }>;
      if (customEvent.detail) {
        if (!customEvent.detail.isOnline) {
          setStatus("offline");
          setLatencyMs(null);
        } else if (customEvent.detail.isServerError) {
          setStatus("server-offline");
        }
      }
    };

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);
    window.addEventListener(HMS_NETWORK_STATUS_CHANGED_EVENT, handleNetworkStatusChange);

    const timer = window.setInterval(() => {
      void checkHealth();
    }, intervalMs);

    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
      window.removeEventListener(HMS_NETWORK_STATUS_CHANGED_EVENT, handleNetworkStatusChange);
      window.clearInterval(timer);
    };
  }, [checkHealth, intervalMs]);

  return {
    status,
    latencyMs,
    isOnline: status === "online" || status === "slow",
    isSlow: status === "slow",
    recheck: checkHealth,
  };
}
