import { z } from "zod";

const optionalText = (max = 255) =>
  z.string().trim().max(max).optional().nullable();

const insurancePolicySchema = z
  .string()
  .trim()
  .max(100)
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d/-]+$/,
    "Insurance policy number must contain letters and numbers. Only letters, numbers, hyphens, and slashes are allowed."
  )
  .optional()
  .nullable();

export const patientBaseSchema = z.object({
  mrn: z.string().trim().min(3).max(50).optional(),

  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .nullable(),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number is required.")
    .optional()
    .nullable(),

  dateOfBirth: z.string().min(1, "Date of birth is required."),

  gender: z.enum(["male", "female", "other"]),

  status: z
    .enum(["active", "inactive", "deceased"])
    .optional(),

  patientCategory: z
    .enum([
      "new_patient",
      "investigation_patient",
      "old_patient",
    ])
    .optional(),

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

  insuranceProviderId: z
    .string()
    .uuid("Select a valid insurance provider.")
    .optional()
    .nullable(),

  insurancePolicyNumber: insurancePolicySchema,
  insuranceCoverageStatus: optionalText(80),
});

function validateInsurance(
  data: {
    insuranceProviderId?: string | null;
    insurancePolicyNumber?: string | null;
    insuranceCoverageStatus?: string | null;
  },
  context: z.RefinementCtx
) {
  const hasProvider = Boolean(data.insuranceProviderId);
  const hasPolicyNumber = Boolean(
    data.insurancePolicyNumber?.trim()
  );

  if (hasProvider && !hasPolicyNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insurancePolicyNumber"],
      message:
        "Insurance policy number is required when an insurance provider is selected.",
    });
  }

  if (!hasProvider && hasPolicyNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insuranceProviderId"],
      message:
        "Select an insurance provider before entering a policy number.",
    });
  }
}

export const patientCreateSchema = patientBaseSchema
  .refine(
    (data) => Boolean(data.email || data.phone),
    {
      message:
        "At least one contact method, email or phone, is required.",
      path: ["phone"],
    }
  )
  .superRefine(validateInsurance);

export const patientUpdateSchema = patientBaseSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required.",
    }
  )
  .superRefine(validateInsurance);

export type PatientCreateDto =
  z.infer<typeof patientCreateSchema>;

export type PatientUpdateDto =
  z.infer<typeof patientUpdateSchema>;