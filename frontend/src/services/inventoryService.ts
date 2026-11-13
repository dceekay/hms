import api from "./api";
import type {
  InventoryItem,
  InventoryItemFormValues,
  InventoryItemKind,
  InventoryMovement,
  InventoryMovementFormValues,
  InventoryStockStatus,
  InventorySummary,
} from "../types/inventory";
import { notifyDataMutated } from "../utils/appEvents";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

const INVENTORY_CACHE_KEY = "hms_cached_inventory_items";

type InventoryListResponse = {
  data: {
    items: InventoryItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: InventorySummary;
  };
};

type InventoryMovementResponse = {
  data: {
    items: InventoryMovement[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanItemPayload(values: InventoryItemFormValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim() || undefined,
    category: values.category.trim() || undefined,
    itemType: values.itemType.trim() || undefined,
    description: values.description.trim() || undefined,
    unit: values.unit.trim() || "unit",
    location: values.location.trim() || undefined,
    department: values.department.trim() || undefined,
    supplier: values.supplier.trim() || undefined,
    serialNumber: values.serialNumber.trim() || undefined,
    batchNumber: values.batchNumber.trim() || undefined,
    costPrice: Number(values.costPrice || 0),
    currentStock: Number(values.currentStock || 0),
    reorderLevel: Number(values.reorderLevel || 0),
    isConsumable: values.isConsumable,
    isActive: values.isActive,
    notes: values.notes.trim() || undefined,
  };
}

function cleanMovementPayload(values: InventoryMovementFormValues) {
  return {
    movementType: values.movementType,
    quantityChange: Number(values.quantityChange || 0),
    reason: values.reason.trim() || undefined,
    destination: values.destination.trim() || undefined,
    issuedTo: values.issuedTo.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchInventoryItems(params: {
  search?: string;
  stockStatus?: InventoryStockStatus;
  category?: string;
  itemKind?: InventoryItemKind;
} = {}) {
  const readCached = (): InventoryListResponse["data"] | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(INVENTORY_CACHE_KEY);
      return raw ? (JSON.parse(raw) as InventoryListResponse["data"]) : null;
    } catch {
      return null;
    }
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readCached();
    if (cached) return { result: cached, error: undefined };
  }

  try {
    const response = await api.get<InventoryListResponse>("/inventory/items", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.stockStatus && params.stockStatus !== "all" ? { stockStatus: params.stockStatus } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.itemKind && params.itemKind !== "all" ? { itemKind: params.itemKind } : {}),
      },
    });

    if (!params.search?.trim() && (!params.stockStatus || params.stockStatus === "all")) {
      try {
        window.localStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify(response.data.data));
      } catch {
        // Ignore storage quota errors
      }
    }

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      const cached = readCached();
      if (cached) return { result: cached, error: undefined };
    }
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load inventory items."),
    };
  }
}

export async function createInventoryItem(values: InventoryItemFormValues) {
  const payload = cleanItemPayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "inventory.create_item",
      label: `Add Inventory Item: ${values.name}`,
      method: "POST",
      path: "/inventory/items",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/inventory/items", source: "inventory-offline" });
    return {
      item: {
        id: `offline-inv-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      } as unknown as InventoryItem,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: InventoryItem }>(
      "/inventory/items",
      payload
    );

    notifyDataMutated({ method: "POST", url: "/inventory/items", source: "inventory" });
    return { item: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      item: null,
      error: getErrorMessage(error, "Unable to create inventory item."),
    };
  }
}

export async function updateInventoryItem(id: string, values: InventoryItemFormValues) {
  const payload = cleanItemPayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "inventory.update_item",
      label: `Update Inventory Item: ${values.name}`,
      method: "PATCH",
      path: `/inventory/items/${id}`,
      body: payload,
    });
    notifyDataMutated({ method: "PATCH", url: `/inventory/items/${id}`, source: "inventory-offline" });
    return {
      item: { id, ...payload } as unknown as InventoryItem,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.patch<{ data: InventoryItem }>(
      `/inventory/items/${id}`,
      payload
    );

    notifyDataMutated({ method: "PATCH", url: `/inventory/items/${id}`, source: "inventory" });
    return { item: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      item: null,
      error: getErrorMessage(error, "Unable to update inventory item."),
    };
  }
}

export async function recordInventoryMovement(values: InventoryMovementFormValues) {
  const payload = cleanMovementPayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "inventory.adjust_stock",
      label: `Inventory Movement (${values.movementType})`,
      method: "POST",
      path: `/inventory/items/${values.itemId}/movements`,
      body: payload,
    });
    notifyDataMutated({
      method: "POST",
      url: `/inventory/items/${values.itemId}/movements`,
      source: "inventory-offline",
    });
    return {
      item: { id: values.itemId } as unknown as InventoryItem,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: InventoryItem }>(
      `/inventory/items/${values.itemId}/movements`,
      payload
    );

    notifyDataMutated({
      method: "POST",
      url: `/inventory/items/${values.itemId}/movements`,
      source: "inventory",
    });
    return { item: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      item: null,
      error: getErrorMessage(error, "Unable to record inventory movement."),
    };
  }
}

export async function fetchInventoryMovements(itemId?: string) {
  try {
    const response = await api.get<InventoryMovementResponse>("/inventory/movements", {
      params: {
        limit: 100,
        ...(itemId ? { itemId } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load inventory movement history."),
    };
  }
}
