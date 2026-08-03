import type { Patient } from "./patient";
import type { AppUser } from "./rbac";

export type LaboratoryFieldType = "text" | "number" | "select" | "textarea";
export type LaboratoryRequestStatus =
  | "pending"
  | "sample_collected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type LaboratoryTemplateField = {
  key: string;
  label: string;
  type: LaboratoryFieldType;
  unit?: string | null;
  referenceRange?: string | null;
  options?: string[];
  required?: boolean;
};

export type LaboratoryTemplate = {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  specimen?: string | null;
  reportTitle?: string | null;
  fields: LaboratoryTemplateField[];
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LaboratoryRequest = {
  id: string;
  requestNumber: string;
  patientId: string;
  templateId: string;
  status: LaboratoryRequestStatus;
  clinicalNotes?: string | null;
  resultValues?: Record<string, unknown> | null;
  interpretation?: string | null;
  technicianNote?: string | null;
  sampleCollectedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  template: LaboratoryTemplate;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
  completedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type LaboratoryTemplateFormValues = {
  name: string;
  code: string;
  category: string;
  specimen: string;
  reportTitle: string;
  notes: string;
  isActive: boolean;
  fields: LaboratoryTemplateField[];
};

export type LaboratoryRequestFormValues = {
  patientId: string;
  templateId: string;
  clinicalNotes: string;
};

export type LaboratoryResultFormValues = {
  resultValues: Record<string, string>;
  interpretation: string;
  technicianNote: string;
};

export type LaboratorySummary = Partial<Record<LaboratoryRequestStatus, number>>;
