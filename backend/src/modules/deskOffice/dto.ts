import { z } from "zod";

export const listInsuranceClaimsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  insuranceProviderId: z.string().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

export const createInsuranceClaimSchema = z.object({
  insuranceProviderId: z.string().uuid(),
  amountClaimed: z.coerce.number().nonnegative(),
  amountProvided: z.coerce.number().nonnegative().default(0),
  claimDate: z.coerce.date(),
  providedDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateInsuranceClaimSchema = createInsuranceClaimSchema.partial();

export type ListInsuranceClaimsQueryDto = z.infer<typeof listInsuranceClaimsQuerySchema>;
export type CreateInsuranceClaimDto = z.infer<typeof createInsuranceClaimSchema>;
export type UpdateInsuranceClaimDto = z.infer<typeof updateInsuranceClaimSchema>;
