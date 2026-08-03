import type { Patient } from "./patient";
import type { AppUser } from "./rbac";

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: string;
  appointmentNumber: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  scheduledFor: string;
  reason?: string | null;
  notes?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  doctor: AppUser;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type AppointmentSummary = Partial<Record<AppointmentStatus, number>>;

export type AppointmentFormValues = {
  patientId: string;
  doctorId: string;
  scheduledFor: string;
  reason: string;
  notes: string;
};
