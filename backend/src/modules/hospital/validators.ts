import { z } from "zod";

export const hospitalProfileSchema = z.object({
  name: z.string().trim().min(2, "Hospital name is required."),
  shortName: z.string().trim().min(2, "Short name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Phone number is required."),
  address: z.string().trim().min(5, "Address is required."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().min(2, "State is required."),
  country: z.string().trim().min(2, "Country is required."),
  logoUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type HospitalProfileDto = z.infer<typeof hospitalProfileSchema>;
