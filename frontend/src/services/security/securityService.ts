import api from "../api";
import type { SecurityEntryFormValues, SecurityEntryLog } from "../../types/security";
import { notifyDataMutated } from "../../utils/appEvents";
import {
  enqueueOfflineOperation,
  getOfflineQueue,
  isLikelyNetworkError,
} from "../../utils/offlineQueue";

const SECURITY_CACHE_KEY = "hms_cached_security_entries";
const MAX_CACHED_ENTRIES = 150;

function readCachedEntries(): SecurityEntryLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SECURITY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SecurityEntryLog[]) : [];
  } catch {
    return [];
  }
}

function writeCachedEntries(entries: SecurityEntryLog[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SECURITY_CACHE_KEY,
      JSON.stringify(entries.slice(0, MAX_CACHED_ENTRIES))
    );
  } catch {
    // Ignore storage quota errors (e.g. if many photos are attached)
    try {
      const stripped = entries.slice(0, 80).map((entry) => ({
        ...entry,
        photoDataUrl: undefined,
      }));
      window.localStorage.setItem(SECURITY_CACHE_KEY, JSON.stringify(stripped));
    } catch {
      // Ignore
    }
  }
}

function applyOfflineQueueOverlay(serverEntries: SecurityEntryLog[]): SecurityEntryLog[] {
  const queue = getOfflineQueue();
  const cached = readCachedEntries();
  const cachedById = new Map(cached.map((entry) => [entry.id, entry]));

  const pendingCreates: SecurityEntryLog[] = [];
  const pendingCheckouts = new Map<string, string>();

  for (const op of queue) {
    if (op.type === "security.create_entry" && op.meta?.localEntryId) {
      const cachedEntry = cachedById.get(op.meta.localEntryId);
      if (cachedEntry) {
        pendingCreates.push({ ...cachedEntry, queued: true });
      }
    }
    if (op.type === "security.checkout_entry") {
      const targetId =
        op.meta?.targetLocalEntryId ||
        op.path.match(/\/security\/entry-logs\/([^/]+)\/checkout/)?.[1];
      const checkedOutAt =
        (op.body as { checkedOutAt?: string } | undefined)?.checkedOutAt ||
        op.createdAt;
      if (targetId) {
        pendingCheckouts.set(targetId, checkedOutAt);
      }
    }
  }

  const merged = [
    ...pendingCreates,
    ...serverEntries.filter((entry) => !pendingCreates.some((p) => p.id === entry.id)),
  ].map((entry) => {
    const queuedCheckoutAt = pendingCheckouts.get(entry.id);
    if (queuedCheckoutAt && !entry.checkedOutAt) {
      return {
        ...entry,
        checkedOutAt: queuedCheckoutAt,
        queued: true,
      };
    }
    return entry;
  });

  return merged;
}

function filterEntriesLocally(
  entries: SecurityEntryLog[],
  search = "",
  options: { activeOnly?: boolean; take?: number } = {}
) {
  const term = search.trim().toLowerCase();
  let filtered = entries;

  if (options.activeOnly) {
    filtered = filtered.filter((entry) => !entry.checkedOutAt);
  }

  if (term) {
    filtered = filtered.filter((entry) => {
      const haystack = [
        entry.name,
        entry.phone,
        entry.staffIdCardNumber,
        entry.patientId,
        entry.destination,
        entry.purpose,
        entry.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  return filtered.slice(0, options.take ?? 100);
}

export async function createSecurityEntry(
  values: SecurityEntryFormValues
): Promise<SecurityEntryLog | null> {
  const queueOffline = () => {
    const localId = `offline-entry-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const optimisticEntry: SecurityEntryLog = {
      ...values,
      id: localId,
      checkedInAt: new Date().toISOString(),
      checkedOutAt: null,
      queued: true,
    };

    enqueueOfflineOperation({
      type: "security.create_entry",
      label: `Gate Check-In: ${values.name || values.personType}`,
      method: "POST",
      path: "/security/entry-logs",
      body: values,
      meta: { localEntryId: localId },
    });

    const cached = readCachedEntries();
    writeCachedEntries([optimisticEntry, ...cached]);
    notifyDataMutated({ method: "POST", url: "/security/entry-logs", source: "security-offline" });
    return optimisticEntry;
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: SecurityEntryLog }>("/security/entry-logs", values);
    const created = response.data.data;
    const cached = readCachedEntries().filter((item) => item.id !== created.id);
    writeCachedEntries([created, ...cached]);
    notifyDataMutated({ method: "POST", url: "/security/entry-logs", source: "security" });
    return created;
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return null;
  }
}

export async function fetchSecurityEntries(
  search = "",
  options: {
    activeOnly?: boolean;
    take?: number;
  } = {}
): Promise<SecurityEntryLog[] | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const overlaid = applyOfflineQueueOverlay(readCachedEntries());
    return filterEntriesLocally(overlaid, search, options);
  }

  try {
    const response = await api.get<{ data: { items: SecurityEntryLog[] } }>("/security/entry-logs", {
      params: {
        take: options.take ?? 50,
        ...(options.activeOnly !== undefined
          ? { activeOnly: options.activeOnly }
          : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    const merged = applyOfflineQueueOverlay(response.data.data.items);
    if (!search.trim() && options.activeOnly === undefined) {
      writeCachedEntries(merged);
    }
    return merged;
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      const overlaid = applyOfflineQueueOverlay(readCachedEntries());
      return filterEntriesLocally(overlaid, search, options);
    }
    console.error(error);
    return null;
  }
}

export async function checkoutSecurityEntry(id: string): Promise<SecurityEntryLog | null> {
  const checkedOutAt = new Date().toISOString();

  const queueOfflineCheckout = (): SecurityEntryLog | null => {
    const isLocalEntry = id.startsWith("offline-entry-");
    enqueueOfflineOperation({
      type: "security.checkout_entry",
      label: "Gate Check-Out",
      method: "POST",
      path: `/security/entry-logs/${id}/checkout`,
      body: { checkedOutAt },
      ...(isLocalEntry ? { meta: { targetLocalEntryId: id } } : {}),
    });

    const cached = readCachedEntries();
    let updatedEntry: SecurityEntryLog | null = null;
    const nextCache = cached.map((item) => {
      if (item.id === id) {
        updatedEntry = { ...item, checkedOutAt, queued: true };
        return updatedEntry;
      }
      return item;
    });
    writeCachedEntries(nextCache);
    notifyDataMutated({
      method: "POST",
      url: `/security/entry-logs/${id}/checkout`,
      source: "security-offline",
    });

    return (
      updatedEntry ?? {
        id,
        personType: "guest",
        checkedInAt: checkedOutAt,
        checkedOutAt,
        queued: true,
      }
    );
  };

  if (id.startsWith("offline-entry-") || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return queueOfflineCheckout();
  }

  try {
    const response = await api.post<{ data: SecurityEntryLog }>(
      `/security/entry-logs/${id}/checkout`,
      { checkedOutAt }
    );
    const updated = response.data.data;
    const nextCache = readCachedEntries().map((item) =>
      item.id === id ? updated : item
    );
    writeCachedEntries(nextCache);
    notifyDataMutated({
      method: "POST",
      url: `/security/entry-logs/${id}/checkout`,
      source: "security",
    });
    return updated;
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOfflineCheckout();
    }
    console.error(error);
    return null;
  }
}
