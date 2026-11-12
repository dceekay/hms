import { useCallback, useEffect, useRef, useState } from "react";
import {
  HMS_NETWORK_STATUS_CHANGED_EVENT,
  HMS_SYNC_QUEUE_CHANGED_EVENT,
  NetworkStatusDetail,
  notifyDataMutated,
} from "../utils/appEvents";
import {
  flushOfflineQueue,
  getOfflineQueueCount,
} from "../utils/offlineQueue";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(getOfflineQueueCount);
  const [isBrowserOnline, setIsBrowserOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setPendingCount(getOfflineQueueCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    const result = await flushOfflineQueue();
    syncingRef.current = false;
    setSyncing(false);
    refreshCount();

    if (result.synced > 0) {
      setLastSyncedAt(new Date().toISOString());
      notifyDataMutated({ source: "offline-sync" });
    }
  }, [refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
      refreshCount();
    };

    const handleFocus = () => {
      refreshCount();
      if (navigator.onLine) {
        void syncNow();
      }
    };

    const handleNetworkStatusChanged = (event: Event) => {
      const detail = (event as CustomEvent<NetworkStatusDetail>).detail;
      if (detail?.isOnline) {
        setIsBrowserOnline(true);
        if (getOfflineQueueCount() > 0) {
          void syncNow();
        }
      } else if (detail && detail.isOnline === false) {
        setIsBrowserOnline(false);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    window.addEventListener(HMS_SYNC_QUEUE_CHANGED_EVENT, refreshCount);
    window.addEventListener(HMS_NETWORK_STATUS_CHANGED_EVENT, handleNetworkStatusChanged);

    const timer = window.setInterval(() => {
      refreshCount();
      if (navigator.onLine) {
        void syncNow();
      }
    }, 30000);

    void syncNow();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(HMS_SYNC_QUEUE_CHANGED_EVENT, refreshCount);
      window.removeEventListener(HMS_NETWORK_STATUS_CHANGED_EVENT, handleNetworkStatusChanged);
      window.clearInterval(timer);
    };
  }, [refreshCount, syncNow]);

  return {
    pendingCount,
    isBrowserOnline,
    syncing,
    lastSyncedAt,
    syncNow,
  };
}

export function useOfflineQueueCount() {
  const [pendingCount, setPendingCount] = useState(getOfflineQueueCount);
  const [isBrowserOnline, setIsBrowserOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const refresh = () => setPendingCount(getOfflineQueueCount());
    const handleOnline = () => {
      setIsBrowserOnline(true);
      refresh();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      refresh();
    };

    window.addEventListener(HMS_SYNC_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(HMS_SYNC_QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    pendingCount,
    isBrowserOnline,
  };
}
