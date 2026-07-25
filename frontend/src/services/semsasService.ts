import axios from "axios";
import api from "./api";
import { SemsasListMeta, SemsasTransfer, SemsasTransferFormValues } from "../types/semsas";

type ApiErrorBody = {
  message?: string;
};

type SemsasListResponse = {
  data: {
    items: SemsasTransfer[];
    meta: SemsasListMeta;
  };
};

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

function cleanPayload(values: SemsasTransferFormValues) {
  return {
    ...Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
    ),
    feeAmount: Number(values.feeAmount || 0),
  };
}

export async function fetchSemsasTransfers(params: {
  search?: string;
  month?: string;
  filingStatus?: string;
} = {}) {
  try {
    const query = {
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.month ? { month: params.month } : {}),
      ...(params.filingStatus ? { filingStatus: params.filingStatus } : {}),
      take: 100,
    };

    const response = await api.get<SemsasListResponse>("/semsas", { params: query });
    return { transfers: response.data.data.items, meta: response.data.data.meta, error: undefined };
  } catch (error) {
    console.error(error);
    return { transfers: null, meta: null, error: getApiErrorMessage(error) };
  }
}

export async function createSemsasTransfer(values: SemsasTransferFormValues) {
  try {
    const response = await api.post<{ data: SemsasTransfer }>("/semsas", cleanPayload(values));
    return { transfer: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { transfer: null, error: getApiErrorMessage(error) };
  }
}

export async function fileSemsasMonth(month: string, notes: string) {
  try {
    const response = await api.post<{ data: { count: number; month: string; filedAt: string } }>("/semsas/filings", {
      month,
      notes: notes || undefined,
    });
    return { filing: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { filing: null, error: getApiErrorMessage(error) };
  }
}
