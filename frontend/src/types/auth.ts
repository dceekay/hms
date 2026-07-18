import { z } from "zod";

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3, "Enter a valid username or email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  phone: z.string().optional(),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export type User = {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
};
