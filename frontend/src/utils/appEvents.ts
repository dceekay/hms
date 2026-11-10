export const HMS_DATA_MUTATED_EVENT = "hms:data-mutated";
export const HMS_SYNC_QUEUE_CHANGED_EVENT = "hms:sync-queue-changed";
export const HMS_SYNC_FLUSHED_EVENT = "hms:sync-flushed";

export type AppMutationDetail = {
  method?: string;
  url?: string;
  source?: string;
};

export function notifyDataMutated(detail: AppMutationDetail = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AppMutationDetail>(HMS_DATA_MUTATED_EVENT, {
      detail,
    })
  );
}

export function notifySyncQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HMS_SYNC_QUEUE_CHANGED_EVENT));
}

export function notifySyncFlushed() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HMS_SYNC_FLUSHED_EVENT));
}

export const HMS_NETWORK_STATUS_CHANGED_EVENT = "hms:network-status-changed";

export type NetworkStatusDetail = {
  isOnline: boolean;
  isServerError?: boolean;
  latencyMs?: number | null;
  source?: string;
};

export function notifyNetworkStatusChanged(detail: NetworkStatusDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NetworkStatusDetail>(HMS_NETWORK_STATUS_CHANGED_EVENT, {
      detail,
    })
  );
}
