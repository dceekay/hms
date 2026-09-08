import api from "./api";
import { enqueueOfflineOperation } from "../utils/offlineQueue";
import { notifyDataMutated } from "../utils/appEvents";
import type {
  MedicationAdministrationRecord,
  NursingNote,
  NursingPatient,
  NursingWorkspace,
  VitalSignRecord,
} from "../types/nursing";

const CACHE_KEY_WORKSPACE = "hms_cached_nurse_workspace";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export function getCachedNurseWorkspace(): NursingWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_WORKSPACE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedNurseWorkspace(data: NursingWorkspace) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY_WORKSPACE, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to cache nurse workspace", err);
  }
}

export async function fetchNursingWorkspace() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = getCachedNurseWorkspace();
    if (cached) return { workspace: cached, error: undefined };
  }

  try {
    const response = await api.get<{ data: NursingWorkspace }>("/nursing/workspace");
    saveCachedNurseWorkspace(response.data.data);
    return { workspace: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    const cached = getCachedNurseWorkspace();
    if (cached) return { workspace: cached, error: undefined };
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
    const cached = getCachedNurseWorkspace();
    if (cached?.patients) {
      const term = search.trim().toLowerCase();
      const filtered = term
        ? cached.patients.filter((p) =>
            [p.firstName, p.lastName, p.mrn, p.phone]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term)
          )
        : cached.patients;
      return { patients: filtered, error: undefined };
    }
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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticRecord: MedicationAdministrationRecord = {
      id: `offline-med-${Date.now()}`,
      status: values.status,
      administeredAt: new Date().toISOString(),
      scheduledFor: values.scheduledFor ?? new Date().toISOString(),
      nurseInitials: values.nurseInitials ?? "NS",
      note: values.note,
    };

    enqueueOfflineOperation({
      type: "nursing.administer_med",
      label: `Administer medication schedule ${scheduleId} (${values.status})`,
      method: "POST",
      path: `/nursing/medication-schedules/${scheduleId}/administer`,
      body: values,
    });

    notifyDataMutated({ source: "nursing" });
    return { record: optimisticRecord, error: undefined };
  }

  try {
    const response = await api.post<{ data: MedicationAdministrationRecord }>(
      `/nursing/medication-schedules/${scheduleId}/administer`,
      values
    );
    notifyDataMutated({ source: "nursing" });
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
  weightKg?: string;
  heightCm?: string;
  notes?: string;
}) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticRecord: VitalSignRecord = {
      id: `offline-vital-${Date.now()}`,
      patientId: values.patientId,
      patient: {
        id: values.patientId,
        firstName: "Patient",
        lastName: "",
        gender: "female",
        dateOfBirth: "2000-01-01",
      } as any,
      recordedAt: new Date().toISOString(),
      temperatureCelsius: values.temperatureCelsius ? Number(values.temperatureCelsius) : undefined,
      systolicBp: values.systolicBp ? Number(values.systolicBp) : undefined,
      diastolicBp: values.diastolicBp ? Number(values.diastolicBp) : undefined,
      pulse: values.pulse ? Number(values.pulse) : undefined,
      respiration: values.respiration ? Number(values.respiration) : undefined,
      spo2: values.spo2 ? Number(values.spo2) : undefined,
      painScore: values.painScore ? Number(values.painScore) : undefined,
      notes: values.notes,
    };

    enqueueOfflineOperation({
      type: "nursing.record_vitals",
      label: `Record patient vitals for patient ${values.patientId}`,
      method: "POST",
      path: "/nursing/vitals",
      body: values,
    });

    notifyDataMutated({ source: "nursing" });
    return { record: optimisticRecord, error: undefined };
  }

  try {
    const response = await api.post<{ data: VitalSignRecord }>("/nursing/vitals", values);
    notifyDataMutated({ source: "nursing" });
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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticNote: NursingNote = {
      id: `offline-note-${Date.now()}`,
      patientId: values.patientId,
      patient: {
        id: values.patientId,
        firstName: "Patient",
        lastName: "",
        gender: "female",
        dateOfBirth: "2000-01-01",
      } as any,
      shift: values.shift,
      note: values.note,
      recordedAt: new Date().toISOString(),
    };

    enqueueOfflineOperation({
      type: "nursing.create_note",
      label: `Create nursing shift note (${values.shift}) for patient ${values.patientId}`,
      method: "POST",
      path: "/nursing/notes",
      body: values,
    });

    notifyDataMutated({ source: "nursing" });
    return { note: optimisticNote, error: undefined };
  }

  try {
    const response = await api.post<{ data: NursingNote }>("/nursing/notes", values);
    notifyDataMutated({ source: "nursing" });
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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueOfflineOperation({
      type: "nursing.acknowledge_order",
      label: `Acknowledge ${values.orderType} order ${values.orderId}`,
      method: "POST",
      path: "/nursing/orders/acknowledge",
      body: values,
    });

    notifyDataMutated({ source: "nursing" });
    return { acknowledgement: { id: `ack-${Date.now()}` }, error: undefined };
  }

  try {
    const response = await api.post<{ data: { id: string } }>("/nursing/orders/acknowledge", values);
    notifyDataMutated({ source: "nursing" });
    return { acknowledgement: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return { acknowledgement: null, error: getErrorMessage(error, "Unable to acknowledge order.") };
  }
}
