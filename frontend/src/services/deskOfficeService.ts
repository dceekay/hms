import axios from "axios";
import api from "./api";
import {
  DeskOfficeDashboard,
  InsuranceClaim,
  InsuranceClaimFormValues,
} from "../types/deskOffice";

type ApiErrorBody = {
  message?: string;
};

type ClaimQuery = {
  search?: string;
  insuranceProviderId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

function cleanClaimPayload(values: InsuranceClaimFormValues) {
  return {
    insuranceProviderId: values.insuranceProviderId,
    amountClaimed: Number(values.amountClaimed || 0),
    amountProvided: Number(values.amountProvided || 0),
    claimDate: values.claimDate,
    providedDate: values.providedDate || null,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchDeskOfficeDashboard(query: ClaimQuery = {}) {
  try {
    const params = {
      limit: 50,
      ...(query.search?.trim() ? { search: query.search.trim() } : {}),
      ...(query.insuranceProviderId ? { insuranceProviderId: query.insuranceProviderId } : {}),
      ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
      ...(query.dateTo ? { dateTo: query.dateTo } : {}),
    };
    const response = await api.get<{ data: DeskOfficeDashboard }>("/desk-office/claims", {
      params,
    });

    return { dashboard: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { dashboard: null, error: getApiErrorMessage(error) };
  }
}

export async function createInsuranceClaim(values: InsuranceClaimFormValues) {
  try {
    const response = await api.post<{ data: InsuranceClaim }>(
      "/desk-office/claims",
      cleanClaimPayload(values)
    );

    return { claim: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { claim: null, error: getApiErrorMessage(error) };
  }
}

export async function updateInsuranceClaim(id: string, values: InsuranceClaimFormValues) {
  try {
    const response = await api.patch<{ data: InsuranceClaim }>(
      `/desk-office/claims/${id}`,
      cleanClaimPayload(values)
    );

    return { claim: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { claim: null, error: getApiErrorMessage(error) };
  }
}
