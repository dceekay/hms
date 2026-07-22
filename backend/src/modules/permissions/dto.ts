import { z } from "zod";

export const createPermissionSchema = z.object({
  name: z.string().min(3).max(150),
  description: z.string().max(255).optional(),
});

export const updatePermissionSchema = createPermissionSchema.partial();

export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>;