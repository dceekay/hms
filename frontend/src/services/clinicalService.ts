import api from "./api";
import type {
  ClinicalEncounter,
  ClinicalEncounterFormValues,
  ClinicalWorkspace,
  Prescription,
  PrescriptionFormValues,
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

export async function fetchDoctorWorkspace() {
  try {
    const response = await api.get<WorkspaceResponse>("/clinical/doctor-workspace");
    return { workspace: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
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
  try {
    const response = await api.post<{ data: ClinicalEncounter }>(
      "/clinical/encounters",
      cleanEncounterPayload(values)
    );

    return { encounter: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      encounter: null,
      error: getErrorMessage(error, "Unable to save clinical note."),
    };
  }
}

export async function completeClinicalEncounter(id: string) {
  try {
    const response = await api.patch<{ data: ClinicalEncounter }>(
      `/clinical/encounters/${id}`,
      { status: "completed" }
    );

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
  try {
    const response = await api.post<{ data: Prescription }>(
      "/clinical/prescriptions",
      cleanPrescriptionPayload(values)
    );

    return { prescription: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      prescription: null,
      error: getErrorMessage(error, "Unable to send prescription."),
    };
  }
}
