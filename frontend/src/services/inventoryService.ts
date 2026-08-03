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

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load inventory items."),
    };
  }
}

export async function createInventoryItem(values: InventoryItemFormValues) {
  try {
    const response = await api.post<{ data: InventoryItem }>(
      "/inventory/items",
      cleanItemPayload(values)
    );

    return { item: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      item: null,
      error: getErrorMessage(error, "Unable to create inventory item."),
    };
  }
}

export async function updateInventoryItem(id: string, values: InventoryItemFormValues) {
  try {
    const response = await api.patch<{ data: InventoryItem }>(
      `/inventory/items/${id}`,
      cleanItemPayload(values)
    );

    return { item: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      item: null,
      error: getErrorMessage(error, "Unable to update inventory item."),
    };
  }
}

export async function recordInventoryMovement(values: InventoryMovementFormValues) {
  try {
    const response = await api.post<{ data: InventoryItem }>(
      `/inventory/items/${values.itemId}/movements`,
      cleanMovementPayload(values)
    );

    return { item: response.data.data, error: undefined };
  } catch (error: any) {
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
