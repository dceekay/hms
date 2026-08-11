import api from "./api";
import type {
  MedicationAdministrationRecord,
  NursingNote,
  NursingPatient,
  NursingWorkspace,
  VitalSignRecord,
} from "../types/nursing";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export async function fetchNursingWorkspace() {
  try {
    const response = await api.get<{ data: NursingWorkspace }>("/nursing/workspace");
    return { workspace: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { workspace: null, error: getErrorMessage(error, "Unable to load nurse dashboard.") };
  }
}

export async function fetchNursingPatients(search = "") {
  try {
    const response = await api.get<{ data: NursingPatient[] }>("/nursing/patients", {
      params: search.trim() ? { search: search.trim() } : undefined,
    });
    return { patients: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { patients: null, error: getErrorMessage(error, "Unable to load patients.") };
  }
}

export async function administerMedication(
  scheduleId: string,
  values: {
    status: "given" | "held" | "missed" | "refused";
    scheduledFor?: string;
    nurseInitials?: string;
    note?: string;
  }
) {
  try {
    const response = await api.post<{ data: MedicationAdministrationRecord }>(
      `/nursing/medication-schedules/${scheduleId}/administer`,
      values
    );
    return { record: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { record: null, error: getErrorMessage(error, "Unable to record medication.") };
  }
}

export async function recordVitals(values: {
  patientId: string;
  temperatureCelsius?: string;
  systolicBp?: string;
  diastolicBp?: string;
  pulse?: string;
  respiration?: string;
  spo2?: string;
  painScore?: string;
  notes?: string;
}) {
  try {
    const response = await api.post<{ data: VitalSignRecord }>("/nursing/vitals", values);
    return { record: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { record: null, error: getErrorMessage(error, "Unable to record vitals.") };
  }
}

export async function createNursingNote(values: {
  patientId: string;
  shift: "morning" | "afternoon" | "night" | "general";
  note: string;
}) {
  try {
    const response = await api.post<{ data: NursingNote }>("/nursing/notes", values);
    return { note: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { note: null, error: getErrorMessage(error, "Unable to save note.") };
  }
}

export async function acknowledgeNurseOrder(values: {
  orderType: "prescription" | "lab_request" | "admission_request" | "referral";
  orderId: string;
  patientId: string;
  note?: string;
}) {
  try {
    const response = await api.post<{ data: { id: string } }>("/nursing/orders/acknowledge", values);
    return { acknowledgement: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { acknowledgement: null, error: getErrorMessage(error, "Unable to acknowledge order.") };
  }
}
