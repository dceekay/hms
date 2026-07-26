import axios from "axios";
import api from "./api";
import {
  HospitalService,
  HospitalServiceFormValues,
  InsuranceProvider,
  InsuranceProviderFormValues,
} from "../types/setup";

type ApiErrorBody = {
  message?: string;
};

type SetupListResponse<T> = {
  data: {
    items: T[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

function cleanProviderPayload(values: InsuranceProviderFormValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    address: values.address.trim() || null,
    description: values.description.trim() || undefined,
    patientPayPercentage: Number(values.patientPayPercentage || 0),
    isActive: values.isActive,
  };
}

function cleanServicePayload(values: HospitalServiceFormValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim() || null,
    description: values.description.trim() || undefined,
    price: Number(values.price || 0),
    isActive: values.isActive,
  };
}

export async function fetchHospitalServices(params: { search?: string } = {}) {
  try {
    const response = await api.get<SetupListResponse<HospitalService>>("/setup/services", {
      params: params.search?.trim() ? { search: params.search.trim(), limit: 100 } : { limit: 100 },
    });

    return { services: response.data.data.items, error: undefined };
  } catch (error) {
    console.error(error);
    return { services: null, error: getApiErrorMessage(error) };
  }
}

export async function createHospitalService(values: HospitalServiceFormValues) {
  try {
    const response = await api.post<{ data: HospitalService }>("/setup/services", cleanServicePayload(values));

    return { service: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { service: null, error: getApiErrorMessage(error) };
  }
}

export async function updateHospitalService(id: string, values: HospitalServiceFormValues) {
  try {
    const response = await api.patch<{ data: HospitalService }>(
      `/setup/services/${id}`,
      cleanServicePayload(values)
    );

    return { service: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { service: null, error: getApiErrorMessage(error) };
  }
}

export async function deactivateHospitalService(id: string) {
  try {
    await api.delete(`/setup/services/${id}`);
    return { success: true, error: undefined };
  } catch (error) {
    console.error(error);
    return { success: false, error: getApiErrorMessage(error) };
  }
}

export async function fetchInsuranceProviders(params: { search?: string } = {}) {
  try {
    const response = await api.get<SetupListResponse<InsuranceProvider>>("/setup/insurance-providers", {
      params: params.search?.trim() ? { search: params.search.trim(), limit: 100 } : { limit: 100 },
    });

    return { providers: response.data.data.items, error: undefined };
  } catch (error) {
    console.error(error);
    return { providers: null, error: getApiErrorMessage(error) };
  }
}

export async function createInsuranceProvider(values: InsuranceProviderFormValues) {
  try {
    const response = await api.post<{ data: InsuranceProvider }>(
      "/setup/insurance-providers",
      cleanProviderPayload(values)
    );

    return { provider: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { provider: null, error: getApiErrorMessage(error) };
  }
}

export async function updateInsuranceProvider(id: string, values: InsuranceProviderFormValues) {
  try {
    const response = await api.patch<{ data: InsuranceProvider }>(
      `/setup/insurance-providers/${id}`,
      cleanProviderPayload(values)
    );

    return { provider: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { provider: null, error: getApiErrorMessage(error) };
  }
}

export async function deactivateInsuranceProvider(id: string) {
  try {
    await api.delete(`/setup/insurance-providers/${id}`);
    return { success: true, error: undefined };
  } catch (error) {
    console.error(error);
    return { success: false, error: getApiErrorMessage(error) };
  }
}
