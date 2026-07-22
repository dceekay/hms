import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),

  description: z.string().optional(),

  permissionIds: z.array(z.string().uuid()).optional()
});

export const updateRoleSchema = createRoleSchema.partial();