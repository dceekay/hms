import { z } from "zod";

const optionalText = (max = 150) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  mine: z.coerce.boolean().optional(),
  date: z.string().trim().optional(),
  status: z
    .enum(["all", "scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"])
    .optional(),
});

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledFor: z.string().trim().optional().or(z.literal("")),
  reason: optionalText(500),
  notes: optionalText(500),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"]),
  notes: optionalText(500),
});

export type ListAppointmentsQueryDto = z.infer<typeof listAppointmentsQuerySchema>;
export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;
