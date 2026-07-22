import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional(),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
export type AssignPermissionsDto = z.infer<typeof assignPermissionsSchema>;