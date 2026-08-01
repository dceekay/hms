import { z } from "zod";

const optionalText = (max = 150) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const listMedicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  stockStatus: z.enum(["all", "low", "out", "expired"]).optional(),
});

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "Medication name is required").max(150),
  genericName: optionalText(),
  brandName: optionalText(),
  category: optionalText(100),
  strength: optionalText(80),
  dosageForm: optionalText(80),
  unit: z.string().trim().min(1).max(40).default("unit"),
  sellingPrice: z.coerce.number().nonnegative().default(0),
  costPrice: z.coerce.number().nonnegative().default(0),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  reorderLevel: z.coerce.number().int().nonnegative().default(10),
  batchNumber: optionalText(80),
  expiryDate: z.string().trim().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export const updateMedicationSchema = medicationSchema.partial();

export const stockAdjustmentSchema = z.object({
  quantityChange: z.coerce.number().int().min(-100000).max(100000),
  reason: optionalText(255),
  notes: optionalText(500),
});

export const dispenseMedicationSchema = z.object({
  medicationId: z.string().uuid(),
  patientId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(10000),
  unitPrice: z.coerce.number().nonnegative().optional(),
  amountPaid: z.coerce.number().nonnegative().optional(),
  paymentStatus: z.enum(["pending", "paid", "cancelled"]).optional(),
  instructions: optionalText(500),
  notes: optionalText(500),
});

export const pharmacySaleItemSchema = z.object({
  medicationId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(10000),
  unitPrice: z.coerce.number().nonnegative().optional(),
  instructions: optionalText(500),
});

export const createPharmacySaleSchema = z.object({
  patientId: z.string().uuid(),
  items: z.array(pharmacySaleItemSchema).min(1, "Add at least one medication"),
  discountAmount: z.coerce.number().nonnegative().default(0),
  amountPaid: z.coerce.number().nonnegative().optional(),
  paymentStatus: z.enum(["pending", "paid", "cancelled"]).optional(),
  notes: optionalText(500),
});

export type ListMedicationsQueryDto = z.infer<typeof listMedicationsQuerySchema>;
export type MedicationDto = z.infer<typeof medicationSchema>;
export type UpdateMedicationDto = z.infer<typeof updateMedicationSchema>;
export type StockAdjustmentDto = z.infer<typeof stockAdjustmentSchema>;
export type DispenseMedicationDto = z.infer<typeof dispenseMedicationSchema>;
export type CreatePharmacySaleDto = z.infer<typeof createPharmacySaleSchema>;
