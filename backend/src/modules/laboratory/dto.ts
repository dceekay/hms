import { z } from "zod";

const optionalText = (max = 150) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const laboratoryTemplateFieldSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["text", "number", "select", "textarea"]).default("text"),
  unit: optionalText(40),
  referenceRange: optionalText(120),
  options: z.array(z.string().trim().min(1).max(80)).optional(),
  required: z.coerce.boolean().default(false),
});

export const laboratoryTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(150),
  code: optionalText(50),
  category: optionalText(100),
  specimen: optionalText(100),
  reportTitle: optionalText(150),
  fields: z.array(laboratoryTemplateFieldSchema).min(1, "Add at least one result field"),
  notes: optionalText(500),
  isActive: z.coerce.boolean().optional(),
});

export const updateLaboratoryTemplateSchema = laboratoryTemplateSchema.partial();

export const listLaboratoryTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  activeOnly: z.coerce.boolean().optional(),
});

export const createLaboratoryRequestSchema = z.object({
  patientId: z.string().uuid(),
  templateId: z.string().uuid(),
  clinicalNotes: optionalText(500),
});

export const updateLaboratoryRequestSchema = z.object({
  status: z.enum(["pending", "sample_collected", "in_progress", "completed", "cancelled"]).optional(),
  clinicalNotes: optionalText(500),
  sampleCollectedAt: z.string().trim().optional().or(z.literal("")),
});

export const completeLaboratoryRequestSchema = z.object({
  resultValues: z.record(z.string(), z.any()).default({}),
  interpretation: optionalText(500),
  technicianNote: optionalText(500),
});

export const listLaboratoryRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(["all", "pending", "sample_collected", "in_progress", "completed", "cancelled"]).optional(),
});

export type LaboratoryTemplateDto = z.infer<typeof laboratoryTemplateSchema>;
export type UpdateLaboratoryTemplateDto = z.infer<typeof updateLaboratoryTemplateSchema>;
export type ListLaboratoryTemplatesQueryDto = z.infer<typeof listLaboratoryTemplatesQuerySchema>;
export type CreateLaboratoryRequestDto = z.infer<typeof createLaboratoryRequestSchema>;
export type UpdateLaboratoryRequestDto = z.infer<typeof updateLaboratoryRequestSchema>;
export type CompleteLaboratoryRequestDto = z.infer<typeof completeLaboratoryRequestSchema>;
export type ListLaboratoryRequestsQueryDto = z.infer<typeof listLaboratoryRequestsQuerySchema>;
