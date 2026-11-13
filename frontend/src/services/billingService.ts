import api from "./api";
import {
  PatientBill,
  PatientBillFormValues,
  BillPaymentStatus,
} from "../types/billing";
import { notifyDataMutated } from "../utils/appEvents";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

const BILLING_CACHE_KEY = "hms_cached_billing_list";

type BillingListResponse = {
  data: {
    items: PatientBill[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      pendingAmount: number | string;
      paidAmount: number | string;
    };
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanBillPayload(values: PatientBillFormValues) {
  return {
    patientId: values.patientId,
    serviceId: values.serviceId,
    quantity: Number(values.quantity || 1),
    unitPrice: Number(values.unitPrice || 0),
    amountPaid: Number(values.amountPaid || 0),
    paymentStatus: values.paymentStatus,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchPatientBills(params: {
  search?: string;
  paymentStatus?: BillPaymentStatus | "all";
} = {}) {
  const readCached = (): BillingListResponse["data"] | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(BILLING_CACHE_KEY);
      return raw ? (JSON.parse(raw) as BillingListResponse["data"]) : null;
    } catch {
      return null;
    }
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readCached();
    if (cached) return { result: cached, error: undefined };
  }

  try {
    const response = await api.get<BillingListResponse>("/billing", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.paymentStatus && params.paymentStatus !== "all"
          ? { paymentStatus: params.paymentStatus }
          : {}),
      },
    });

    if (!params.search?.trim() && (!params.paymentStatus || params.paymentStatus === "all")) {
      try {
        window.localStorage.setItem(BILLING_CACHE_KEY, JSON.stringify(response.data.data));
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
      error: getErrorMessage(error, "Unable to load patient bills."),
    };
  }
}

export async function createPatientBill(values: PatientBillFormValues) {
  const payload = cleanBillPayload(values);

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "billing.create_bill",
      label: "Create Patient Bill",
      method: "POST",
      path: "/billing",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/billing", source: "billing-offline" });

    const total = Number(payload.quantity) * Number(payload.unitPrice);
    const amountPaid = Number(payload.amountPaid || 0);
    return {
      bill: {
        id: `offline-bill-${Date.now()}`,
        patientId: payload.patientId,
        serviceId: payload.serviceId,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        totalAmount: total,
        amountPaid,
        balance: Math.max(0, total - amountPaid),
        paymentStatus: payload.paymentStatus,
        notes: payload.notes ?? null,
        createdAt: new Date().toISOString(),
      } as unknown as PatientBill,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: PatientBill }>(
      "/billing",
      payload
    );

    notifyDataMutated({ method: "POST", url: "/billing", source: "billing" });
    return { bill: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      bill: null,
      error: getErrorMessage(error, "Unable to create patient bill."),
    };
  }
}
