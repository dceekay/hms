import axios from "axios";
import api from "../api";
import {
  Patient,
  PatientFormValues,
  PatientInsuranceProvider,
  PatientQr,
} from "../../types/patient";
import { CANONICAL_INSURANCE_PROVIDERS } from "../../constants/insuranceProviders";

type ApiErrorBody = {
  message?: string;
};

export type PatientUpdatePayload = {
  [Key in keyof PatientFormValues]?: PatientFormValues[Key] | null;
};

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function createPatient(
  values: PatientFormValues
): Promise<{ patient: Patient | null; error?: string }> {
  try {
    const endpoint =
      values.patientCategory === "investigation_patient"
        ? "/patients/investigations"
        : "/patients";

    const response = await api.post<{ data: Patient }>(endpoint, values);
    return { patient: response.data.data };
  } catch (error) {
    console.error(error);
    return { patient: null, error: getApiErrorMessage(error) };
  }
}

export async function updatePatient(
  patientId: string,
  values: PatientUpdatePayload
): Promise<{ patient: Patient | null; error?: string }> {
  try {
    const response = await api.patch<{ data: Patient }>(
      `/patients/${patientId}`,
      values
    );

    return { patient: response.data.data };
  } catch (error) {
    console.error(error);
    return { patient: null, error: getApiErrorMessage(error) };
  }
}

export async function fetchPatientInsuranceProviders(): Promise<{
  providers: PatientInsuranceProvider[] | null;
  error?: string;
}> {
  try {
    const response = await api.get<{
      data: PatientInsuranceProvider[];
    }>("/patients/insurance-providers");

    const fetched = response.data?.data;
    if (Array.isArray(fetched) && fetched.length > 0) {
      return {
        providers: fetched,
      };
    }
  } catch (error) {
    console.warn("Using canonical insurance providers fallback:", error);
  }

  // Gracefully fallback to all 24 canonical HMO providers
  const fallbackProviders: PatientInsuranceProvider[] = CANONICAL_INSURANCE_PROVIDERS.map((provider) => ({
    id: `provider-${provider.code.toLowerCase()}`,
    name: provider.name,
    code: provider.code,
    isActive: true,
  }));

  return {
    providers: fallbackProviders,
  };
}

const PATIENTS_CACHE_KEY = "hms_cached_patients_directory";

export function getCachedPatients(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PATIENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedPatients(patients: Patient[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PATIENTS_CACHE_KEY, JSON.stringify(patients));
  } catch (err) {
    console.error("Failed to cache patients locally:", err);
  }
}

export type PatientListParams = {
  search?: string;
  status?: string;
  patientCategory?: string;
  page?: number;
  take?: number;
};

export async function fetchPatients(
  params: PatientListParams = {}
): Promise<Patient[] | null> {
  try {
    const query = {
      ...(params.take ? { take: params.take } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.patientCategory
        ? { patientCategory: params.patientCategory }
        : {}),
    };

    const response = await api.get<{
      data: { items: Patient[] };
    }>("/patients", {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    const items = response.data.data.items;
    if (items && items.length > 0) {
      saveCachedPatients(items);
    }
    return items;
  } catch (error) {
    console.error(error);
    const cached = getCachedPatients();
    if (cached.length > 0) return cached;
    return null;
  }
}

export async function convertInvestigationPatient(
  patientId: string
): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(
      `/patients/${patientId}/convert-to-hospital`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function reactivatePatient(
  patientId: string
): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(
      `/patients/${patientId}/reactivate`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deactivatePatient(
  patientId: string
): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(
      `/patients/${patientId}/deactivate`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deletePatientPermanently(
  patientId: string
): Promise<{ success: boolean; message?: string } | null> {
  try {
    const response = await api.delete<{ data: { success: boolean; message?: string } }>(
      `/patients/${patientId}`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchPatientQr(
  patientId: string
): Promise<PatientQr | null> {
  try {
    const response = await api.get<{ data: PatientQr }>(
      `/patients/${patientId}/qr`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export type PatientVerification = {
  id?: string;
  mrn: string | null;
  fullName: string;
  gender: string;
  status?: string | null;
  patientCategory?: string | null;
  phone?: string | null;
  insuranceProvider?: string | null;
  insurancePrincipalName?: string | null;
  insuranceMemberNumber?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverageStatus?: string | null;
};

export async function verifyPatientPublic(
  qrCode: string
): Promise<PatientVerification | null> {
  try {
    const baseURL =
      (import.meta.env.VITE_API_URL as string | undefined) ||
      "http://localhost:5000/api/v1";
    const response = await axios.get<{ data: PatientVerification }>(
      `${baseURL.replace(/\/$/, "")}/patients/verify/${encodeURIComponent(qrCode)}`
    );

    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
