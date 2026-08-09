import { z } from "zod";

const optionalText = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const assignBedSchema = z.object({
  patientId: z.string().uuid(),
  bedId: z.string().uuid(),
  doctorId: z.string().uuid().optional().or(z.literal("")),
  admissionRequestId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  diagnosis: optionalText(500),
  reason: z.string().trim().min(2, "Reason is required").max(500),
  notes: optionalText(1000),
  expectedDischargeAt: z.coerce.date().optional().nullable(),
});

export const dischargeAssignmentSchema = z.object({
  dischargeDisposition: optionalText(150),
  notes: optionalText(1000),
  nextBedStatus: z.enum(["cleaning", "available"]).default("cleaning"),
});

export const updateBedStatusSchema = z.object({
  status: z.enum(["available", "reserved", "cleaning", "maintenance", "blocked"]),
});

export type AssignBedDto = z.infer<typeof assignBedSchema>;
export type DischargeAssignmentDto = z.infer<typeof dischargeAssignmentSchema>;
export type UpdateBedStatusDto = z.infer<typeof updateBedStatusSchema>;
