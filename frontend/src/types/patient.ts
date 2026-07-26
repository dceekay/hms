import { z } from "zod";

const insurancePolicyNumberPattern =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d/-]+$/;

export const patientSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required."),

    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required."),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .optional()
      .or(z.literal("")),

    phone: z
      .string()
      .trim()
      .min(7, "Phone number must contain at least 7 characters.")
      .optional()
      .or(z.literal("")),

    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required."),

    gender: z.enum([
      "male",
      "female",
      "other",
    ]),

    patientCategory: z
      .enum([
        "new_patient",
        "investigation_patient",
        "old_patient",
      ])
      .optional(),

    address: z
      .string()
      .trim()
      .max(255)
      .optional(),

    city: z
      .string()
      .trim()
      .max(100)
      .optional(),

    state: z
      .string()
      .trim()
      .max(100)
      .optional(),

    country: z
      .string()
      .trim()
      .max(100)
      .optional(),

    emergencyContactName: z
      .string()
      .trim()
      .max(150)
      .optional(),

    emergencyContactPhone: z
      .string()
      .trim()
      .max(30)
      .optional(),

    emergencyContactRelationship: z
      .string()
      .trim()
      .max(80)
      .optional(),

    bloodGroup: z
      .string()
      .trim()
      .max(10)
      .optional(),

    genotype: z
      .string()
      .trim()
      .max(10)
      .optional(),

    allergies: z
      .string()
      .trim()
      .max(500)
      .optional(),

    /*
     * Insurance is optional.
     *
     * The empty string is accepted because this value comes
     * directly from a dropdown when no provider is selected.
     */
    insuranceProviderId: z
      .string()
      .uuid("Select a valid insurance provider.")
      .optional()
      .or(z.literal("")),

    insurancePolicyNumber: z
      .string()
      .trim()
      .max(
        100,
        "Insurance policy number cannot exceed 100 characters."
      )
      .optional()
      .or(z.literal("")),

    insuranceCoverageStatus: z
      .string()
      .trim()
      .max(80)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, context) => {
    const insuranceProviderId =
      data.insuranceProviderId?.trim() ?? "";

    const insurancePolicyNumber =
      data.insurancePolicyNumber?.trim() ?? "";

    if (
      insuranceProviderId &&
      !insurancePolicyNumber
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["insurancePolicyNumber"],
        message:
          "Insurance policy number is required when an insurance provider is selected.",
      });
    }

    if (
      !insuranceProviderId &&
      insurancePolicyNumber
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["insuranceProviderId"],
        message:
          "Select an insurance provider before entering a policy number.",
      });
    }

    if (
      insurancePolicyNumber &&
      !insurancePolicyNumberPattern.test(
        insurancePolicyNumber
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["insurancePolicyNumber"],
        message:
          "Insurance policy number must contain at least one letter and one number. Only letters, numbers, hyphens, and slashes are allowed.",
      });
    }
  });

export type PatientFormValues =
  z.infer<typeof patientSchema>;

export type PatientInsuranceProvider = {
  id: string;
  name: string;
  code?: string | null;
  patientPayPercentage?:
    | number
    | string
    | null;
  isActive?: boolean;
};

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
  patientCategory?: string;

  convertedToHospitalAt?: string | null;
  reactivatedAt?: string | null;

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

  insuranceProviderId?: string | null;

  insuranceProvider?:
    | PatientInsuranceProvider
    | null;

  insurancePolicyNumber?: string | null;
  insuranceCoverageStatus?: string | null;

  version?: number;

  createdAt?: string;
  updatedAt?: string;
};

export type PatientQr = {
  patientId: string;
  mrn: string | null;
  qrCode: string;
  lookupPath: string;
};