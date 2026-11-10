import {
  notifyDataMutated,
  notifySyncFlushed,
  notifySyncQueueChanged,
} from "./appEvents";

const STORAGE_KEY = "hms_offline_sync_queue";

export type OfflineOperationType =
  | "laboratory.create_request"
  | "laboratory.create_requests"
  | "laboratory.update_status"
  | "laboratory.complete_result"
  | "inventory.create_item"
  | "inventory.adjust_stock"
  | "billing.create_bill"
  | "pharmacy.create_sale"
  | "clinical.create_note"
  | "clinical.create_prescription"
  | "clinical.create_admission"
  | "clinical.create_referral"
  | "nursing.record_vitals"
  | "nursing.administer_med"
  | "nursing.create_note"
  | "nursing.acknowledge_order"
  | "patient.register_patient"
  | "patient.update_patient"
  | "appointments.book_appointment"
  | "appointments.update_status";

export type OfflineOperation = {
  id: string;
  type: OfflineOperationType;
  label: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

export type OfflineFlushResult = {
  synced: number;
  remaining: number;
  blocked: boolean;
};

function apiBaseUrl() {
  return (
    (import.meta.env.VITE_API_URL as string | undefined) ||
    "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");
}

function readQueue(): OfflineOperation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineOperation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifySyncQueueChanged();
}

export function getOfflineQueue() {
  return readQueue();
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function enqueueOfflineOperation(
  operation: Omit<OfflineOperation, "id" | "createdAt" | "retryCount">
) {
  const queued: OfflineOperation = {
    ...operation,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  writeQueue([...readQueue(), queued]);
  return queued;
}

export function updateOfflineOperationBody(id: string, body: unknown) {
  const queue = readQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return false;

  writeQueue(
    queue.map((item, itemIndex) =>
      itemIndex === index ? { ...item, body } : item
    )
  );
  return true;
}

export function isLikelyNetworkError(error: unknown) {
  const candidate = error as {
    response?: unknown;
    code?: string;
    message?: string;
  };

  return (
    typeof navigator !== "undefined" &&
    !navigator.onLine
  ) || (
    !candidate.response &&
    ["ERR_NETWORK", "ECONNABORTED", "Network Error"].some((value) =>
      `${candidate.code ?? ""} ${candidate.message ?? ""}`.includes(value)
    )
  );
}

export async function flushOfflineQueue(): Promise<OfflineFlushResult> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { synced: 0, remaining: 0, blocked: false };
  }

  if (!navigator.onLine) {
    return {
      synced: 0,
      remaining: readQueue().length,
      blocked: true,
    };
  }

  const token = window.localStorage.getItem("hms_token");
  let queue = readQueue();
  let synced = 0;
  let blocked = false;

  for (const operation of queue) {
    try {
      const response = await fetch(`${apiBaseUrl()}${operation.path}`, {
        method: operation.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: operation.body ? JSON.stringify(operation.body) : undefined,
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          blocked = true;
          break;
        }

        const text = await response.text();
        throw new Error(text || `Sync failed with status ${response.status}`);
      }

      synced += 1;
      queue = queue.filter((item) => item.id !== operation.id);
      writeQueue(queue);
      notifyDataMutated({
        method: operation.method,
        url: operation.path,
        source: "offline-sync",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sync offline item.";

      queue = queue.map((item) =>
        item.id === operation.id
          ? {
              ...item,
              retryCount: item.retryCount + 1,
              lastError: message.slice(0, 250),
            }
          : item
      );
      writeQueue(queue);
      blocked = true;
      break;
    }
  }

  if (synced > 0) {
    notifySyncFlushed();
  }

  return {
    synced,
    remaining: queue.length,
    blocked,
  };
}
