import { z } from "zod";

const optionalText = (max = 255) => z.string().trim().max(max).optional().nullable();

const securityEntryBaseSchema = z.object({
  personType: z.enum(["patient", "patient_relative", "staff", "guest"]),
  name: optionalText(150),
  phone: optionalText(30),
  patientId: optionalText(50),
  staffIdCardNumber: optionalText(80),
  purpose: optionalText(255),
  destination: optionalText(150),
    notes: optionalText(500),
    photoUrl: optionalText(500),
    photoDataUrl: z.string().trim().max(1_000_000).optional().nullable(),
    photoMimeType: z.enum(["image/webp", "image/jpeg", "image/png"]).optional().nullable(),
  photoSizeBytes: z.number().int().positive().max(750_000).optional().nullable(),
  photoWidth: z.number().int().positive().max(2000).optional().nullable(),
  photoHeight: z.number().int().positive().max(2000).optional().nullable(),
});

function validateSecurityEntryRules(
  data: Partial<z.infer<typeof securityEntryBaseSchema>>,
  context: z.RefinementCtx
) {
    const hasName = Boolean(data.name);
    const hasPhone = Boolean(data.phone);

    if (data.personType !== "guest" && (!hasName || !hasPhone)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name and phone are required for patients, patient relatives, and staff.",
        path: ["name"],
      });
    }

    if (data.personType === "staff" && !data.staffIdCardNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Staff ID card number is required for staff entry.",
        path: ["staffIdCardNumber"],
      });
    }

    if ((data.photoUrl || data.photoDataUrl) && !data.photoMimeType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Photo MIME type is required when photo data is provided.",
        path: ["photoMimeType"],
      });
    }

    if (data.photoDataUrl && !data.photoDataUrl.startsWith("data:image/webp;base64,")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Captured photos must be compressed to a WebP data URL.",
        path: ["photoDataUrl"],
      });
    }
}

export const securityEntryCreateSchema = securityEntryBaseSchema.superRefine(
  validateSecurityEntryRules
);

export const securityEntryUpdateSchema = securityEntryBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required.")
  .superRefine(validateSecurityEntryRules);

export const securityEntryCheckoutSchema = z.object({
  checkedOutAt: z.string().datetime().optional(),
});

export type SecurityEntryCreateDto = z.infer<typeof securityEntryCreateSchema>;
export type SecurityEntryUpdateDto = z.infer<typeof securityEntryUpdateSchema>;
export type SecurityEntryCheckoutDto = z.infer<typeof securityEntryCheckoutSchema>;
