import { z } from "zod";

export const securityPersonTypes = ["patient", "patient_relative", "staff", "guest"] as const;

export const securityEntrySchema = z.object({
  personType: z.enum(securityPersonTypes),
  name: z.string().optional(),
  phone: z.string().optional(),
  patientId: z.string().optional(),
  staffIdCardNumber: z.string().optional(),
  purpose: z.string().optional(),
  destination: z.string().optional(),
  notes: z.string().optional(),
  photoDataUrl: z.string().optional(),
  photoMimeType: z.string().optional(),
  photoSizeBytes: z.number().optional(),
  photoWidth: z.number().optional(),
  photoHeight: z.number().optional(),
});

export type SecurityEntryFormValues = z.infer<typeof securityEntrySchema>;

export type SecurityEntryLog = SecurityEntryFormValues & {
  id: string;
  checkedInAt: string;
  checkedOutAt?: string | null;
  recordedById?: string | null;
};
