import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(7).max(30).optional(),
  email: z.string().email().optional(),
  serviceAreaId: z.string().uuid().optional().nullable(),
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
