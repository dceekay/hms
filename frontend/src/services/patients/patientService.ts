import api from "../api";
import { PatientFormValues, Patient, PatientQr } from "../../types/patient";

export async function createPatient(values: PatientFormValues): Promise<Patient | null> {
  try {
    const endpoint =
      values.patientCategory === "investigation_patient" ? "/patients/investigations" : "/patients";
    const response = await api.post<{ data: Patient }>(endpoint, values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

type PatientListParams = {
  search?: string;
  status?: string;
  patientCategory?: string;
};

export async function fetchPatients(params: PatientListParams = {}): Promise<Patient[] | null> {
  try {
    const query = {
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.patientCategory ? { patientCategory: params.patientCategory } : {}),
    };

    const response = await api.get<{ data: { items: Patient[] } }>("/patients", {
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function convertInvestigationPatient(patientId: string): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(`/patients/${patientId}/convert-to-hospital`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function reactivatePatient(patientId: string): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(`/patients/${patientId}/reactivate`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deactivatePatient(patientId: string): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>(`/patients/${patientId}/deactivate`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchPatientQr(patientId: string): Promise<PatientQr | null> {
  try {
    const response = await api.get<{ data: PatientQr }>(`/patients/${patientId}/qr`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
