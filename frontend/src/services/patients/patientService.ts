import axios from "axios";
import api from "../api";
import {
  Patient,
  PatientFormValues,
  PatientInsuranceProvider,
  PatientQr,
} from "../../types/patient";

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

    return {
      providers: response.data.data,
    };
  } catch (error) {
    console.error(error);

    return {
      providers: null,
      error: getApiErrorMessage(error),
    };
  }
}

type PatientListParams = {
  search?: string;
  status?: string;
  patientCategory?: string;
};

export async function fetchPatients(
  params: PatientListParams = {}
): Promise<Patient[] | null> {
  try {
    const query = {
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

    return response.data.data.items;
  } catch (error) {
    console.error(error);
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