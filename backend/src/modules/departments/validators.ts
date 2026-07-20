import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required."),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required.").optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
