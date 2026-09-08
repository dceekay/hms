import api from "./api";
import { enqueueOfflineOperation, updateOfflineOperationBody } from "../utils/offlineQueue";
import { notifyDataMutated } from "../utils/appEvents";
import type {
  AdmissionRequestFormValues,
  ClinicalAdmissionRequest,
  ClinicalEncounter,
  ClinicalEncounterFormValues,
  ClinicalReferral,
  ClinicalWorkspace,
  Prescription,
  PrescriptionFormValues,
  ReferralFormValues,
} from "../types/clinical";

type WorkspaceResponse = {
  data: ClinicalWorkspace;
};

type EncounterListResponse = {
  data: {
    items: ClinicalEncounter[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type PrescriptionListResponse = {
  data: {
    items: Prescription[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

const CACHE_KEY_DOCTOR_WORKSPACE = "hms_cached_doctor_workspace";

export function getCachedDoctorWorkspace(): ClinicalWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_DOCTOR_WORKSPACE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedDoctorWorkspace(data: ClinicalWorkspace) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY_DOCTOR_WORKSPACE, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to cache doctor workspace", err);
  }
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanEncounterPayload(values: ClinicalEncounterFormValues) {
  return {
    patientId: values.patientId,
    visitType: values.visitType.trim() || undefined,
    chiefComplaint: values.chiefComplaint.trim() || undefined,
    history: values.history.trim() || undefined,
    examination: values.examination.trim() || undefined,
    diagnosis: values.diagnosis.trim() || undefined,
    remarks: values.remarks.trim() || undefined,
    plan: values.plan.trim() || undefined,
  };
}

function cleanPrescriptionPayload(values: PrescriptionFormValues) {
  return {
    patientId: values.patientId,
    encounterId: values.encounterId || undefined,
    notes: values.notes.trim() || undefined,
    items: values.items.map((item) => ({
      medicationId: item.medicationId || undefined,
      medicationName: item.medicationName.trim(),
      strength: item.strength.trim() || undefined,
      dosageForm: item.dosageForm.trim() || undefined,
      dose: item.dose.trim(),
      frequency: item.frequency.trim(),
      duration: item.duration.trim(),
      quantity: item.quantity ? Number(item.quantity) : undefined,
      instructions: item.instructions.trim() || undefined,
    })),
  };
}

function cleanAdmissionPayload(values: AdmissionRequestFormValues) {
  return {
    patientId: values.patientId,
    encounterId: values.encounterId || undefined,
    wardId: values.wardId || undefined,
    bedId: values.bedId || undefined,
    priority: values.priority,
    diagnosis: values.diagnosis.trim() || undefined,
    reason: values.reason.trim(),
    notes: values.notes.trim() || undefined,
  };
}

function cleanReferralPayload(values: ReferralFormValues) {
  return {
    patientId: values.patientId,
    encounterId: values.encounterId || undefined,
    priority: values.priority,
    destinationFacility: values.destinationFacility.trim(),
    departmentOrSpecialty: values.departmentOrSpecialty.trim() || undefined,
    reason: values.reason.trim(),
    clinicalSummary: values.clinicalSummary.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchDoctorWorkspace() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = getCachedDoctorWorkspace();
    if (cached) return { workspace: cached, error: undefined };
  }

  try {
    const response = await api.get<WorkspaceResponse>("/clinical/doctor-workspace");
    saveCachedDoctorWorkspace(response.data.data);
    return { workspace: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    const cached = getCachedDoctorWorkspace();
    if (cached) return { workspace: cached, error: undefined };
    return {
      workspace: null,
      error: getErrorMessage(error, "Unable to load doctor workspace."),
    };
  }
}

export async function fetchClinicalEncounters(params: {
  patientId?: string;
  search?: string;
} = {}) {
  try {
    const response = await api.get<EncounterListResponse>("/clinical/encounters", {
      params: {
        limit: 100,
        ...(params.patientId ? { patientId: params.patientId } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load clinical notes."),
    };
  }
}

export async function createClinicalEncounter(values: ClinicalEncounterFormValues) {
  const payload = cleanEncounterPayload(values);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queuedOperation = enqueueOfflineOperation({
      type: "clinical.create_note",
      label: `Clinical encounter for patient ${payload.patientId}`,
      method: "POST",
      path: "/clinical/encounters",
      body: payload,
    });
    const optimisticEncounter = {
      id: `offline-enc:${queuedOperation.id}`,
      encounterNumber: `ENC-OFF-${Date.now().toString().slice(-4)}`,
      patientId: payload.patientId,
      doctorId: "offline-doctor",
      visitType: payload.visitType ?? "General consultation",
      chiefComplaint: payload.chiefComplaint,
      history: payload.history,
      examination: payload.examination,
      diagnosis: payload.diagnosis,
      remarks: payload.remarks,
      plan: payload.plan,
      status: "open",
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ClinicalEncounter;

    notifyDataMutated({ source: "clinical" });
    return { encounter: optimisticEncounter, error: undefined, queued: true };
  }

  try {
    const response = await api.post<{ data: ClinicalEncounter }>(
      "/clinical/encounters",
      payload
    );
    notifyDataMutated({ source: "clinical" });
    return { encounter: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      encounter: null,
      error: getErrorMessage(error, "Unable to save clinical note."),
    };
  }
}

export async function updateClinicalEncounter(id: string, values: ClinicalEncounterFormValues) {
  const payload = cleanEncounterPayload(values);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queuedCreateId = id.startsWith("offline-enc:")
      ? id.slice("offline-enc:".length)
      : null;
    const updatedQueuedCreate = queuedCreateId
      ? updateOfflineOperationBody(queuedCreateId, payload)
      : false;

    if (!updatedQueuedCreate) {
      enqueueOfflineOperation({
        type: "clinical.create_note",
        label: `Update clinical encounter ${id}`,
        method: "PATCH",
        path: `/clinical/encounters/${id}`,
        body: payload,
      });
    }

    notifyDataMutated({ source: "clinical" });
    return {
      encounter: {
        id,
        ...payload,
        status: "open",
        updatedAt: new Date().toISOString(),
      } as unknown as ClinicalEncounter,
      error: undefined,
      queued: true,
    };
  }

  try {
    const response = await api.patch<{ data: ClinicalEncounter }>(
      `/clinical/encounters/${id}`,
      payload
    );
    notifyDataMutated({ source: "clinical" });
    return { encounter: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      encounter: null,
      error: getErrorMessage(error, "Unable to update clinical note."),
    };
  }
}

export async function completeClinicalEncounter(id: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueOfflineOperation({
      type: "clinical.create_note",
      label: `Close clinical encounter ${id}`,
      method: "PATCH",
      path: `/clinical/encounters/${id}`,
      body: { status: "completed" },
    });

    notifyDataMutated({ source: "clinical" });
    return {
      encounter: {
        id,
        status: "completed",
        endedAt: new Date().toISOString(),
      } as unknown as ClinicalEncounter,
      error: undefined,
      queued: true,
    };
  }

  try {
    const response = await api.patch<{ data: ClinicalEncounter }>(
      `/clinical/encounters/${id}`,
      { status: "completed" }
    );
    notifyDataMutated({ source: "clinical" });
    return { encounter: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      encounter: null,
      error: getErrorMessage(error, "Unable to close consultation."),
    };
  }
}

export async function fetchPrescriptions(params: {
  patientId?: string;
  search?: string;
} = {}) {
  try {
    const response = await api.get<PrescriptionListResponse>("/clinical/prescriptions", {
      params: {
        limit: 100,
        ...(params.patientId ? { patientId: params.patientId } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load prescriptions."),
    };
  }
}

export async function createPrescription(values: PrescriptionFormValues) {
  const payload = cleanPrescriptionPayload(values);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticPrescription = {
      id: `offline-rx-${Date.now()}`,
      prescriptionNumber: `RX-OFF-${Date.now().toString().slice(-4)}`,
      patientId: payload.patientId,
      doctorId: "offline-doctor",
      status: "sent_to_pharmacy",
      notes: payload.notes,
      items: payload.items.map((item, idx) => ({
        id: `offline-rx-item-${Date.now()}-${idx}`,
        prescriptionId: `offline-rx-${Date.now()}`,
        medicationId: item.medicationId,
        medicationName: item.medicationName,
        strength: item.strength,
        dosageForm: item.dosageForm,
        dose: item.dose,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions,
        isDispensed: false,
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Prescription;

    enqueueOfflineOperation({
      type: "clinical.create_prescription",
      label: `Prescription for patient ${payload.patientId}`,
      method: "POST",
      path: "/clinical/prescriptions",
      body: payload,
    });

    notifyDataMutated({ source: "clinical" });
    return { prescription: optimisticPrescription, error: undefined, queued: true };
  }

  try {
    const response = await api.post<{ data: Prescription }>(
      "/clinical/prescriptions",
      payload
    );
    notifyDataMutated({ source: "clinical" });
    return { prescription: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      prescription: null,
      error: getErrorMessage(error, "Unable to send prescription."),
    };
  }
}

export async function createAdmissionRequest(values: AdmissionRequestFormValues) {
  const payload = cleanAdmissionPayload(values);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticRequest = {
      id: `offline-adm-${Date.now()}`,
      requestNumber: `ADM-OFF-${Date.now().toString().slice(-4)}`,
      patientId: payload.patientId,
      doctorId: "offline-doctor",
      wardId: payload.wardId,
      bedId: payload.bedId,
      priority: payload.priority,
      status: "pending",
      diagnosis: payload.diagnosis,
      reason: payload.reason,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ClinicalAdmissionRequest;

    enqueueOfflineOperation({
      type: "clinical.create_admission",
      label: `Admission request for patient ${payload.patientId}`,
      method: "POST",
      path: "/clinical/admission-requests",
      body: payload,
    });

    notifyDataMutated({ source: "clinical" });
    return { admissionRequest: optimisticRequest, error: undefined, queued: true };
  }

  try {
    const response = await api.post<{ data: ClinicalAdmissionRequest }>(
      "/clinical/admission-requests",
      payload
    );
    notifyDataMutated({ source: "clinical" });
    return { admissionRequest: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      admissionRequest: null,
      error: getErrorMessage(error, "Unable to request admission or ward."),
    };
  }
}

export async function createReferral(values: ReferralFormValues) {
  const payload = cleanReferralPayload(values);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const optimisticReferral = {
      id: `offline-ref-${Date.now()}`,
      referralNumber: `REF-OFF-${Date.now().toString().slice(-4)}`,
      patientId: payload.patientId,
      doctorId: "offline-doctor",
      priority: payload.priority,
      status: "pending",
      destinationFacility: payload.destinationFacility,
      departmentOrSpecialty: payload.departmentOrSpecialty,
      reason: payload.reason,
      clinicalSummary: payload.clinicalSummary,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ClinicalReferral;

    enqueueOfflineOperation({
      type: "clinical.create_referral",
      label: `Referral for patient ${payload.patientId}`,
      method: "POST",
      path: "/clinical/referrals",
      body: payload,
    });

    notifyDataMutated({ source: "clinical" });
    return { referral: optimisticReferral, error: undefined, queued: true };
  }

  try {
    const response = await api.post<{ data: ClinicalReferral }>(
      "/clinical/referrals",
      payload
    );
    notifyDataMutated({ source: "clinical" });
    return { referral: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      referral: null,
      error: getErrorMessage(error, "Unable to create referral."),
    };
  }
}
