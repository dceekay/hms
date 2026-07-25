import { z } from "zod";

export const semsasTransferCreateSchema = z.object({
  transferType: z.enum([
    "hospital_ambulance_to_other_hospital",
    "hospital_ambulance_to_this_hospital",
    "external_ambulance_to_this_hospital",
  ]),
  patientId: z.string().uuid().optional().nullable(),
  patientName: z.string().trim().min(2).max(150),
  patientPhone: z.string().trim().max(30).optional().nullable(),
  fromFacility: z.string().trim().min(2).max(180),
  toFacility: z.string().trim().min(2).max(180),
  ambulanceProvider: z.string().trim().max(150).optional().nullable(),
  ambulancePlateNumber: z.string().trim().max(80).optional().nullable(),
  driverName: z.string().trim().max(150).optional().nullable(),
  driverPhone: z.string().trim().max(30).optional().nullable(),
  pickupAddress: z.string().trim().max(255).optional().nullable(),
  destinationAddress: z.string().trim().max(255).optional().nullable(),
  transferDate: z.string().min(1),
  feeAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const semsasTransferUpdateSchema = semsasTransferCreateSchema.partial();

export const semsasFilingSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM format."),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type SemsasTransferCreateDto = z.infer<typeof semsasTransferCreateSchema>;
export type SemsasTransferUpdateDto = z.infer<typeof semsasTransferUpdateSchema>;
export type SemsasFilingDto = z.infer<typeof semsasFilingSchema>;
