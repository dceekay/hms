import api from "./api";
import { notifyDataMutated } from "../utils/appEvents";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

const PHARMACY_MEDS_CACHE_KEY = "hms_cached_pharmacy_meds";
import type {
  Medication,
  MedicationFormValues,
  PharmacyDispense,
  PharmacyDispenseFormValues,
  PharmacySale,
  PharmacySaleFormValues,
  PharmacyStockMovement,
  PharmacyStockStatus,
  PharmacySummary,
} from "../types/pharmacy";

type MedicationListResponse = {
  data: {
    items: Medication[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: PharmacySummary;
  };
};

type DispenseListResponse = {
  data: {
    items: PharmacyDispense[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type SaleListResponse = {
  data: {
    items: PharmacySale[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      paidAmount: number | string;
      pendingAmount: number | string;
    };
  };
};

type StockMovementListResponse = {
  data: {
    items: PharmacyStockMovement[];
    total: number;
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanMedicationPayload(values: MedicationFormValues) {
  return {
    name: values.name.trim(),
    genericName: values.genericName.trim() || undefined,
    brandName: values.brandName.trim() || undefined,
    category: values.category.trim() || undefined,
    strength: values.strength.trim() || undefined,
    dosageForm: values.dosageForm.trim() || undefined,
    unit: values.unit.trim() || "unit",
    sellingPrice: Number(values.sellingPrice || 0),
    costPrice: Number(values.costPrice || 0),
    currentStock: Number(values.currentStock || 0),
    reorderLevel: Number(values.reorderLevel || 0),
    batchNumber: values.batchNumber.trim() || undefined,
    expiryDate: values.expiryDate || undefined,
    isActive: values.isActive,
  };
}

function cleanDispensePayload(values: PharmacyDispenseFormValues) {
  return {
    patientId: values.patientId,
    medicationId: values.medicationId,
    quantity: Number(values.quantity || 1),
    unitPrice: Number(values.unitPrice || 0),
    amountPaid: Number(values.amountPaid || 0),
    paymentStatus: values.paymentStatus,
    instructions: values.instructions.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

function cleanSalePayload(values: PharmacySaleFormValues) {
  return {
    patientId: values.patientId,
    prescriptionId: values.prescriptionId?.trim() || undefined,
    items: values.items.map((item) => ({
      medicationId: item.medicationId,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      instructions: item.instructions.trim() || undefined,
    })),
    discountAmount: Number(values.discountAmount || 0),
    amountPaid: Number(values.amountPaid || 0),
    paymentStatus: values.paymentStatus,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchMedications(params: {
  search?: string;
  stockStatus?: PharmacyStockStatus;
} = {}) {
  const readCached = (): MedicationListResponse["data"] | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PHARMACY_MEDS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as MedicationListResponse["data"]) : null;
    } catch {
      return null;
    }
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readCached();
    if (cached) return { result: cached, error: undefined };
  }

  try {
    const response = await api.get<MedicationListResponse>("/pharmacy/medications", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.stockStatus && params.stockStatus !== "all"
          ? { stockStatus: params.stockStatus }
          : {}),
      },
    });

    if (!params.search?.trim() && (!params.stockStatus || params.stockStatus === "all")) {
      try {
        window.localStorage.setItem(PHARMACY_MEDS_CACHE_KEY, JSON.stringify(response.data.data));
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
      error: getErrorMessage(error, "Unable to load medications."),
    };
  }
}

export async function createMedication(values: MedicationFormValues) {
  const payload = cleanMedicationPayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "pharmacy.create_medication",
      label: `Add Medication: ${values.name}`,
      method: "POST",
      path: "/pharmacy/medications",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/pharmacy/medications", source: "pharmacy-offline" });
    return {
      medication: {
        id: `offline-med-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      } as unknown as Medication,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: Medication }>(
      "/pharmacy/medications",
      payload
    );

    notifyDataMutated({ method: "POST", url: "/pharmacy/medications", source: "pharmacy" });
    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to create medication."),
    };
  }
}

export async function updateMedication(id: string, values: MedicationFormValues) {
  const payload = cleanMedicationPayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "pharmacy.update_medication",
      label: `Update Medication: ${values.name}`,
      method: "PATCH",
      path: `/pharmacy/medications/${id}`,
      body: payload,
    });
    notifyDataMutated({ method: "PATCH", url: `/pharmacy/medications/${id}`, source: "pharmacy-offline" });
    return {
      medication: { id, ...payload } as unknown as Medication,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.patch<{ data: Medication }>(
      `/pharmacy/medications/${id}`,
      payload
    );

    notifyDataMutated({ method: "PATCH", url: `/pharmacy/medications/${id}`, source: "pharmacy" });
    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to update medication."),
    };
  }
}

export async function adjustMedicationStock(id: string, values: {
  quantityChange: number;
  reason?: string;
  notes?: string;
}) {
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "pharmacy.adjust_stock",
      label: `Adjust Drug Stock (${values.quantityChange > 0 ? "+" : ""}${values.quantityChange})`,
      method: "POST",
      path: `/pharmacy/medications/${id}/stock`,
      body: values,
    });
    notifyDataMutated({ method: "POST", url: `/pharmacy/medications/${id}/stock`, source: "pharmacy-offline" });
    return {
      medication: { id } as unknown as Medication,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: Medication }>(
      `/pharmacy/medications/${id}/stock`,
      values
    );

    notifyDataMutated({ method: "POST", url: `/pharmacy/medications/${id}/stock`, source: "pharmacy" });
    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to update stock."),
    };
  }
}

export async function fetchPharmacyDispenses(search = "") {
  try {
    const response = await api.get<DispenseListResponse>("/pharmacy/dispenses", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy invoices."),
    };
  }
}

export async function dispenseMedication(values: PharmacyDispenseFormValues) {
  const payload = cleanDispensePayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "pharmacy.dispense",
      label: `Dispense Drug (Qty: ${payload.quantity})`,
      method: "POST",
      path: "/pharmacy/dispenses",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/pharmacy/dispenses", source: "pharmacy-offline" });
    return {
      dispense: {
        id: `offline-dispense-${Date.now()}`,
        ...payload,
        dispensedAt: new Date().toISOString(),
      } as unknown as PharmacyDispense,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: PharmacyDispense }>(
      "/pharmacy/dispenses",
      payload
    );

    notifyDataMutated({ method: "POST", url: "/pharmacy/dispenses", source: "pharmacy" });
    return { dispense: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      dispense: null,
      error: getErrorMessage(error, "Unable to dispense medication."),
    };
  }
}

export async function fetchPharmacySales(search = "") {
  try {
    const response = await api.get<SaleListResponse>("/pharmacy/sales", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy sales."),
    };
  }
}

export async function createPharmacySale(values: PharmacySaleFormValues) {
  const payload = cleanSalePayload(values);
  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "pharmacy.create_sale",
      label: `Pharmacy Sale (${payload.items.length} item${payload.items.length === 1 ? "" : "s"})`,
      method: "POST",
      path: "/pharmacy/sales",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/pharmacy/sales", source: "pharmacy-offline" });
    return {
      sale: {
        id: `offline-sale-${Date.now()}`,
        receiptNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
        totalAmount: 0,
        amountPaid: payload.amountPaid ?? 0,
        paymentStatus: payload.paymentStatus,
        createdAt: new Date().toISOString(),
      } as unknown as PharmacySale,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: PharmacySale }>(
      "/pharmacy/sales",
      payload
    );

    notifyDataMutated({ source: "pharmacy" });
    return { sale: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      sale: null,
      error: getErrorMessage(error, "Unable to complete pharmacy sale."),
    };
  }
}

export async function fetchPharmacyStockMovements(medicationId?: string) {
  try {
    const response = await api.get<StockMovementListResponse>("/pharmacy/stock-movements", {
      params: {
        limit: 100,
        ...(medicationId ? { medicationId } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy stock movements."),
    };
  }
}
