import { z } from "zod";

const optionalText = (max = 150) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const listClinicalQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  patientId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  status: z.enum(["open", "completed", "cancelled"]).optional(),
});

export const createEncounterSchema = z.object({
  patientId: z.string().uuid(),
  visitType: optionalText(100),
  chiefComplaint: optionalText(500),
  history: optionalText(1000),
  examination: optionalText(1000),
  diagnosis: optionalText(500),
  remarks: optionalText(1000),
  plan: optionalText(1000),
});

export const updateEncounterSchema = createEncounterSchema.partial().extend({
  status: z.enum(["open", "completed", "cancelled"]).optional(),
});

export const prescriptionItemSchema = z.object({
  medicationId: z.string().uuid().optional().or(z.literal("")),
  medicationName: z.string().trim().min(1, "Medicine name is required").max(150),
  strength: optionalText(80),
  dosageForm: optionalText(80),
  dose: z.string().trim().min(1, "Dose is required").max(120),
  frequency: z.string().trim().min(1, "Frequency is required").max(120),
  duration: z.string().trim().min(1, "Duration is required").max(120),
  quantity: z.coerce.number().int().positive().max(10000).optional(),
  instructions: optionalText(500),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  notes: optionalText(500),
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medicine"),
});

export const updatePrescriptionStatusSchema = z.object({
  status: z.enum(["sent_to_pharmacy", "dispensed", "cancelled"]),
});

export const createAdmissionRequestSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  wardId: z.string().uuid().optional().or(z.literal("")),
  bedId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  diagnosis: optionalText(500),
  reason: z.string().trim().min(2, "Reason is required").max(500),
  notes: optionalText(1000),
});

export const updateAdmissionRequestStatusSchema = z.object({
  status: z.enum(["pending", "approved", "admitted", "cancelled"]),
});

export const createReferralSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  destinationFacility: z.string().trim().min(2, "Destination facility is required").max(180),
  departmentOrSpecialty: optionalText(150),
  reason: z.string().trim().min(2, "Referral reason is required").max(500),
  clinicalSummary: optionalText(1500),
  notes: optionalText(1000),
});

export const updateReferralStatusSchema = z.object({
  status: z.enum(["pending", "sent", "completed", "cancelled"]),
});

export type ListClinicalQueryDto = z.infer<typeof listClinicalQuerySchema>;
export type CreateEncounterDto = z.infer<typeof createEncounterSchema>;
export type UpdateEncounterDto = z.infer<typeof updateEncounterSchema>;
export type CreatePrescriptionDto = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionStatusDto = z.infer<typeof updatePrescriptionStatusSchema>;
export type CreateAdmissionRequestDto = z.infer<typeof createAdmissionRequestSchema>;
export type UpdateAdmissionRequestStatusDto = z.infer<typeof updateAdmissionRequestStatusSchema>;
export type CreateReferralDto = z.infer<typeof createReferralSchema>;
export type UpdateReferralStatusDto = z.infer<typeof updateReferralStatusSchema>;
