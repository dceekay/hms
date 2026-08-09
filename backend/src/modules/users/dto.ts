import { z } from "zod";

const photoFields = {
  photoUrl: z.string().trim().max(500).optional().nullable(),
  photoDataUrl: z.string().trim().max(1_000_000).optional().nullable(),
  photoMimeType: z.enum(["image/webp", "image/jpeg", "image/png"]).optional().nullable(),
  photoSizeBytes: z.number().int().positive().max(750_000).optional().nullable(),
  photoWidth: z.number().int().positive().max(2000).optional().nullable(),
  photoHeight: z.number().int().positive().max(2000).optional().nullable(),
};

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  email: z.string().email().optional(),
  serviceAreaId: z.string().uuid().optional().nullable(),
  ...photoFields,
}).superRefine((data, context) => {
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
      message: "Staff photos must be compressed to a WebP data URL.",
      path: ["photoDataUrl"],
    });
  }
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().max(150),
  username: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(100),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  serviceAreaId: z.string().uuid().optional().nullable(),
  roleIds: z.array(z.string().uuid()).default([]),
  ...photoFields,
}).superRefine((data, context) => {
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
      message: "Staff photos must be compressed to a WebP data URL.",
      path: ["photoDataUrl"],
    });
  }
});

export const createDoctorSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().max(150),
  username: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(100),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  serviceAreaId: z.string().uuid().optional().nullable(),
  doctorType: z.enum(["medical_doctor", "visiting_consultant", "visiting_specialist"]),
  specialty: z.string().trim().max(150).optional().or(z.literal("")),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type AssignRolesDto = z.infer<typeof assignRolesSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type CreateDoctorDto = z.infer<typeof createDoctorSchema>;
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
