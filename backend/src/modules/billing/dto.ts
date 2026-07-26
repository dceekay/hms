import { z } from "zod";

export const billPaymentStatusSchema = z.enum([
  "pending",
  "paid",
  "cancelled",
]);

export const createPatientBillSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(999).default(1),
  unitPrice: z.coerce.number().nonnegative().optional(),
  amountPaid: z.coerce.number().nonnegative().optional(),
  paymentStatus: billPaymentStatusSchema.optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const listPatientBillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  paymentStatus: billPaymentStatusSchema.optional(),
  patientId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
});

export type CreatePatientBillDto = z.infer<typeof createPatientBillSchema>;
export type ListPatientBillsQueryDto = z.infer<typeof listPatientBillsQuerySchema>;
