import type { LaboratoryRequest, LaboratoryTemplate } from "./laboratory";
import type { Patient } from "./patient";
import type { Medication } from "./pharmacy";
import type { AppUser } from "./rbac";
import type { Appointment } from "./appointment";

export type ClinicalEncounterStatus = "open" | "completed" | "cancelled";
export type PrescriptionStatus = "sent_to_pharmacy" | "dispensed" | "cancelled";

export type PrescriptionItem = {
  id: string;
  prescriptionId: string;
  medicationId?: string | null;
  medicationName: string;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  frequency: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
  medication?: Medication | null;
  createdAt?: string;
};

export type Prescription = {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  doctorId: string;
  encounterId?: string | null;
  status: PrescriptionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  items: PrescriptionItem[];
};

export type ClinicalEncounter = {
  id: string;
  encounterNumber: string;
  patientId: string;
  doctorId: string;
  visitType?: string | null;
  chiefComplaint?: string | null;
  history?: string | null;
  examination?: string | null;
  diagnosis?: string | null;
  remarks?: string | null;
  plan?: string | null;
  status: ClinicalEncounterStatus;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  prescriptions?: Prescription[];
};

export type ClinicalWorkspace = {
  patients: Patient[];
  assignedAppointments: Appointment[];
  recentEncounters: ClinicalEncounter[];
  recentPrescriptions: Prescription[];
  pendingLabRequests: LaboratoryRequest[];
  completedLabRequests: LaboratoryRequest[];
  medications: Medication[];
  summary: {
    activePatients: number;
    assignedAppointments: number;
    todayEncounters: number;
    pendingLabRequests: number;
    completedLabResults: number;
    prescriptionsSent: number;
    encounters: Partial<Record<ClinicalEncounterStatus, number>>;
  };
};

export type ClinicalEncounterFormValues = {
  patientId: string;
  visitType: string;
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  remarks: string;
  plan: string;
};

export type PrescriptionItemFormValues = {
  medicationId: string;
  medicationName: string;
  strength: string;
  dosageForm: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
};

export type PrescriptionFormValues = {
  patientId: string;
  encounterId: string;
  notes: string;
  items: PrescriptionItemFormValues[];
};

export type DoctorLabRequestFormValues = {
  patientId: string;
  templateId: string;
  clinicalNotes: string;
};

export type DoctorWorkspaceHelpers = {
  templates: LaboratoryTemplate[];
};
