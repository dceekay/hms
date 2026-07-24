import { z } from "zod";

const optionalText = (max = 255) => z.string().trim().max(max).optional().nullable();

export const patientBaseSchema = z.object({
  mrn: z.string().trim().min(3).max(50).optional(),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email address.").optional().nullable(),
  phone: z.string().min(7, "Phone number is required.").optional().nullable(),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["male", "female", "other"]),
  status: z.enum(["active", "inactive", "deceased"]).optional(),
  address: optionalText(255),
  city: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  emergencyContactName: optionalText(150),
  emergencyContactPhone: optionalText(30),
  emergencyContactRelationship: optionalText(80),
  bloodGroup: optionalText(10),
  genotype: optionalText(10),
  allergies: optionalText(500),
  insuranceProviderId: z.string().uuid().optional().nullable(),
  insurancePolicyNumber: optionalText(100),
  insuranceCoverageStatus: optionalText(80),
});

export const patientCreateSchema = patientBaseSchema.refine(
  (data) => Boolean(data.email || data.phone),
  "At least one contact method, email or phone, is required."
);

export const patientUpdateSchema = patientBaseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required."
);

export type PatientCreateDto = z.infer<typeof patientCreateSchema>;
export type PatientUpdateDto = z.infer<typeof patientUpdateSchema>;
