import { z } from "zod";

export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().min(7, "Phone number is required.").optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["male", "female", "other"]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  allergies: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceCoverageStatus: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export type Patient = {
  id: string;
  mrn?: string | null;
  qrCode?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth: string;
  gender: string;
  status?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  bloodGroup?: string | null;
  genotype?: string | null;
  allergies?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverageStatus?: string | null;
  version?: number;
};

export type PatientQr = {
  patientId: string;
  mrn: string | null;
  qrCode: string;
  lookupPath: string;
};
