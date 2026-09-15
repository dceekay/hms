import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).max(30).optional(),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false),
  deviceDetails: z
    .object({
      screen: z.string().optional(),
      viewport: z.string().optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
      networkType: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;


