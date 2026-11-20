import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RETRY_KEY = "hms_chunk_retry_at";

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await importer();
      try {
        sessionStorage.removeItem(RETRY_KEY);
      } catch {
        // ignore storage restrictions in private mode
      }
      return mod;
    } catch (error) {
      let shouldReload = false;
      try {
        const last = Number(sessionStorage.getItem(RETRY_KEY) || "0");
        if (!last || Date.now() - last > 15000) {
          sessionStorage.setItem(RETRY_KEY, String(Date.now()));
          shouldReload = true;
        }
      } catch {
        shouldReload = false;
      }

      if (shouldReload && typeof window !== "undefined") {
        try {
          if ("caches" in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((k) => window.caches.delete(k)));
          }
        } catch {
          // ignore cache clear errors
        }
        window.location.reload();
        return new Promise<never>(() => {});
      }

      throw error;
    }
  });
}
