import type { Patient } from "./patient";
import type { AppUser } from "./rbac";
import type { ClinicalRequestPriority } from "./clinical";

export type BedStatus = "available" | "occupied" | "maintenance" | "reserved" | "cleaning" | "blocked";
export type WardAssignmentStatus = "active" | "discharged" | "transferred" | "cancelled";

export type WardRoom = {
  id: string;
  name: string;
  roomNumber: string;
  roomType?: string | null;
  wardId?: string | null;
  isActive?: boolean;
};

export type WardBed = {
  id: string;
  bedNumber: string;
  status: BedStatus;
  wardId?: string | null;
  roomId?: string | null;
  ward?: WardSummaryBase | null;
  room?: WardRoom | null;
  currentAssignment?: WardBedAssignment | null;
};

export type WardSummaryBase = {
  id: string;
  name: string;
  code?: string | null;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  wardType?: string | null;
  nurseStation?: string | null;
  wardManager?: string | null;
  contactNumber?: string | null;
  description?: string | null;
  isActive: boolean;
};

export type WardStatusSummary = Record<BedStatus, number> & {
  total: number;
  occupancyRate: number;
};

export type WardBoard = WardSummaryBase & {
  rooms: WardRoom[];
  beds: WardBed[];
  summary: WardStatusSummary;
};

export type WardBedAssignment = {
  id: string;
  admissionNumber: string;
  patientId: string;
  wardId?: string | null;
  roomId?: string | null;
  bedId: string;
  doctorId?: string | null;
  assignedById?: string | null;
  admissionRequestId?: string | null;
  status: WardAssignmentStatus;
  priority: ClinicalRequestPriority;
  diagnosis?: string | null;
  reason: string;
  notes?: string | null;
  admittedAt: string;
  expectedDischargeAt?: string | null;
  dischargedAt?: string | null;
  patient: Patient;
  bed: WardBed;
  ward?: WardSummaryBase | null;
  room?: WardRoom | null;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  assignedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type WardAdmissionRequest = {
  id: string;
  requestNumber: string;
  patientId: string;
  doctorId: string;
  wardId?: string | null;
  bedId?: string | null;
  priority: ClinicalRequestPriority;
  status: "pending" | "approved";
  diagnosis?: string | null;
  reason: string;
  notes?: string | null;
  createdAt: string;
  patient: Patient;
  doctor?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  ward?: WardSummaryBase | null;
  bed?: WardBed | null;
};

export type WardDashboard = {
  summary: WardStatusSummary;
  wards: WardBoard[];
  beds: WardBed[];
  activeAdmissions: WardBedAssignment[];
  admissionRequests: WardAdmissionRequest[];
  patients: Patient[];
  doctors: Pick<AppUser, "id" | "firstName" | "lastName" | "username">[];
};

export type WardAssignmentFormValues = {
  patientId: string;
  bedId: string;
  doctorId: string;
  admissionRequestId: string;
  priority: ClinicalRequestPriority;
  diagnosis: string;
  reason: string;
  notes: string;
  expectedDischargeAt: string;
};

export type WardFormValues = {
  name: string;
  code: string;
  department: string;
  building: string;
  floor: string;
  wardType: string;
  nurseStation: string;
  wardManager: string;
  contactNumber: string;
  description: string;
};
