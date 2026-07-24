import api from "../api";
import { PatientFormValues, Patient, PatientQr } from "../../types/patient";

export async function createPatient(values: PatientFormValues): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>("/patients", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchPatients(search = ""): Promise<Patient[] | null> {
  try {
    const response = await api.get<{ data: { items: Patient[] } }>("/patients", {
      params: search.trim() ? { search: search.trim() } : undefined,
    });
    return response.data.data.items;
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
