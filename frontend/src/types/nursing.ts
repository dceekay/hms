import type { Patient } from "./patient";
import type { AppUser } from "./rbac";

export type NurseView =
  | "overview"
  | "patients"
  | "ward"
  | "medications"
  | "orders"
  | "vitals"
  | "notes"
  | "reminders";

export type NursingWardAdmission = {
  id: string;
  admissionNumber: string;
  patientId: string;
  ward?: { id: string; name: string; code?: string | null } | null;
  room?: { id: string; name: string; roomNumber: string } | null;
  bed?: { id: string; bedNumber: string } | null;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  admittedAt: string;
  diagnosis?: string | null;
  reason?: string | null;
};

export type NursingPatient = Patient & {
  isAdmitted?: boolean;
  currentAdmission?: NursingWardAdmission | null;
};

export type MedicationAdministrationRecord = {
  id: string;
  status: "given" | "held" | "missed" | "refused";
  scheduledFor: string;
  administeredAt: string;
  nurseInitials: string;
  note?: string | null;
  nurse?: Pick<AppUser, "id" | "firstName" | "lastName" | "username">;
};

export type MedicationAdministrationSchedule = {
  id: string;
  patientId: string;
  patient: NursingPatient;
  doctorId: string;
  medicationName: string;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  route?: string | null;
  frequency: string;
  duration: string;
  instructions?: string | null;
  startAt: string;
  endAt?: string | null;
  nextDueAt?: string | null;
  intervalHours?: number | null;
  isActive: boolean;
  prescription?: {
    id: string;
    prescriptionNumber: string;
    doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  };
  records: MedicationAdministrationRecord[];
};

export type VitalSignRecord = {
  id: string;
  patientId: string;
  patient: NursingPatient;
  temperatureCelsius?: string | number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulse?: number | null;
  respiration?: number | null;
  spo2?: number | null;
  painScore?: number | null;
  notes?: string | null;
  recordedAt: string;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username">;
};

export type NursingNote = {
  id: string;
  patientId: string;
  patient: NursingPatient;
  shift: "morning" | "afternoon" | "night" | "general";
  note: string;
  recordedAt: string;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username">;
};

export type NurseOrderAcknowledgement = {
  id: string;
  orderType: string;
  orderId: string;
  patientId: string;
  nurseId: string;
  note?: string | null;
  acknowledgedAt: string;
};

export type NursingWorkspace = {
  summary: {
    activePatients: number;
    admittedPatients: number;
    dueMedication: number;
    overdueMedication: number;
    completedMedicationToday: number;
    newDoctorOrders: number;
    pendingVitals: number;
    nursingNotesToday: number;
  };
  patients: NursingPatient[];
  activeAdmissions: NursingWardAdmission[];
  medicationSchedules: MedicationAdministrationSchedule[];
  recentVitals: VitalSignRecord[];
  recentNotes: NursingNote[];
  acknowledgements: NurseOrderAcknowledgement[];
  doctorOrders: {
    prescriptions: any[];
    labRequests: any[];
    admissionRequests: any[];
    referrals: any[];
  };
};
