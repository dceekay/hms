import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(7).max(30).optional(),
  email: z.string().email().optional(),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type AssignRolesDto = z.infer<typeof assignRolesSchema>;
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;