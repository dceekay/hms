import api from "../api";
import { PatientFormValues, Patient } from "../../types/patient";

export async function createPatient(values: PatientFormValues): Promise<Patient | null> {
  try {
    const response = await api.post<{ data: Patient }>("/patients", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchPatients(): Promise<Patient[] | null> {
  try {
    const response = await api.get<{ data: { items: Patient[] } }>("/patients");
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}
