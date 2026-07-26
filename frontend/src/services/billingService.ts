import api from "./api";
import {
  PatientBill,
  PatientBillFormValues,
  BillPaymentStatus,
} from "../types/billing";

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

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load patient bills."),
    };
  }
}

export async function createPatientBill(values: PatientBillFormValues) {
  try {
    const response = await api.post<{ data: PatientBill }>(
      "/billing",
      cleanBillPayload(values)
    );

    return { bill: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      bill: null,
      error: getErrorMessage(error, "Unable to create patient bill."),
    };
  }
}
