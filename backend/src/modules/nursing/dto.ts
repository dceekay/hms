import { z } from "zod";

const optionalText = z.string().trim().optional().nullable();

export const medicationAdministrationSchema = z.object({
  status: z.enum(["given", "held", "missed", "refused"]),
  scheduledFor: z.coerce.date().optional(),
  nurseInitials: z.string().trim().max(20).optional(),
  note: optionalText,
});

export const vitalSignSchema = z.object({
  patientId: z.string().uuid(),
  temperatureCelsius: z.coerce.number().min(25).max(45).optional(),
  systolicBp: z.coerce.number().int().min(40).max(280).optional(),
  diastolicBp: z.coerce.number().int().min(20).max(180).optional(),
  pulse: z.coerce.number().int().min(20).max(240).optional(),
  respiration: z.coerce.number().int().min(5).max(80).optional(),
  spo2: z.coerce.number().int().min(40).max(100).optional(),
  painScore: z.coerce.number().int().min(0).max(10).optional(),
  notes: optionalText,
});

export const nursingNoteSchema = z.object({
  patientId: z.string().uuid(),
  shift: z.enum(["morning", "afternoon", "night", "general"]).default("general"),
  note: z.string().trim().min(2).max(1500),
});

export const orderAcknowledgementSchema = z.object({
  orderType: z.enum(["prescription", "lab_request", "admission_request", "referral"]),
  orderId: z.string().uuid(),
  patientId: z.string().uuid(),
  note: optionalText,
});

export const nursingPatientQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export type MedicationAdministrationDto = z.infer<typeof medicationAdministrationSchema>;
export type VitalSignDto = z.infer<typeof vitalSignSchema>;
export type NursingNoteDto = z.infer<typeof nursingNoteSchema>;
export type OrderAcknowledgementDto = z.infer<typeof orderAcknowledgementSchema>;
export type NursingPatientQueryDto = z.infer<typeof nursingPatientQuerySchema>;
