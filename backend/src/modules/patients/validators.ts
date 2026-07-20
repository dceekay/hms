import { z } from "zod";

export const patientCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(7, "Phone number is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["male", "female", "other"]),
});

export type PatientCreateDto = z.infer<typeof patientCreateSchema>;
