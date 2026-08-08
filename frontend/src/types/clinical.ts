import type { LaboratoryRequest, LaboratoryTemplate } from "./laboratory";
import type { Patient } from "./patient";
import type { Medication } from "./pharmacy";
import type { AppUser } from "./rbac";
import type { Appointment } from "./appointment";

export type ClinicalEncounterStatus = "open" | "completed" | "cancelled";
export type PrescriptionStatus = "sent_to_pharmacy" | "dispensed" | "cancelled";
export type ClinicalRequestPriority = "routine" | "urgent" | "emergency";
export type AdmissionRequestStatus = "pending" | "approved" | "admitted" | "cancelled";
export type ReferralStatus = "pending" | "sent" | "completed" | "cancelled";

export type Ward = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type Room = {
  id: string;
  name: string;
  roomNumber: string;
  roomType?: string | null;
};

export type Bed = {
  id: string;
  bedNumber: string;
  status: "available" | "occupied" | "maintenance" | "reserved";
  wardId?: string | null;
  roomId?: string | null;
  ward?: Ward | null;
  room?: Room | null;
};

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

export type ClinicalAdmissionRequest = {
  id: string;
  requestNumber: string;
  patientId: string;
  doctorId: string;
  encounterId?: string | null;
  wardId?: string | null;
  bedId?: string | null;
  priority: ClinicalRequestPriority;
  status: AdmissionRequestStatus;
  diagnosis?: string | null;
  reason: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  encounter?: ClinicalEncounter | null;
  ward?: Ward | null;
  bed?: Bed | null;
};

export type ClinicalReferral = {
  id: string;
  referralNumber: string;
  patientId: string;
  doctorId: string;
  encounterId?: string | null;
  status: ReferralStatus;
  priority: ClinicalRequestPriority;
  destinationFacility: string;
  departmentOrSpecialty?: string | null;
  reason: string;
  clinicalSummary?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  encounter?: ClinicalEncounter | null;
};

export type ClinicalWorkspace = {
  patients: Patient[];
  assignedAppointments: Appointment[];
  recentEncounters: ClinicalEncounter[];
  recentPrescriptions: Prescription[];
  pendingLabRequests: LaboratoryRequest[];
  completedLabRequests: LaboratoryRequest[];
  medications: Medication[];
  admissionRequests: ClinicalAdmissionRequest[];
  referrals: ClinicalReferral[];
  wards: Ward[];
  availableBeds: Bed[];
  summary: {
    activePatients: number;
    assignedAppointments: number;
    todayEncounters: number;
    pendingLabRequests: number;
    completedLabResults: number;
    prescriptionsSent: number;
    pendingAdmissionRequests: number;
    referralsSent: number;
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

export type AdmissionRequestFormValues = {
  patientId: string;
  encounterId: string;
  wardId: string;
  bedId: string;
  priority: ClinicalRequestPriority;
  diagnosis: string;
  reason: string;
  notes: string;
};

export type ReferralFormValues = {
  patientId: string;
  encounterId: string;
  priority: ClinicalRequestPriority;
  destinationFacility: string;
  departmentOrSpecialty: string;
  reason: string;
  clinicalSummary: string;
  notes: string;
};

export type DoctorLabRequestFormValues = {
  patientId: string;
  templateId: string;
  clinicalNotes: string;
};

export type DoctorWorkspaceHelpers = {
  templates: LaboratoryTemplate[];
};
