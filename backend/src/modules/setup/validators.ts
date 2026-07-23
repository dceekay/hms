import { z } from "zod";

export const setupResourceSchema = z.enum([
  "specialties",
  "wards",
  "rooms",
  "beds",
  "services",
  "insurance-providers",
]);

const commonNamedSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const specialtySchema = commonNamedSchema;
export const wardSchema = commonNamedSchema;

export const roomSchema = commonNamedSchema.extend({
  roomNumber: z.string().trim().min(1).max(50),
  roomType: z.string().trim().max(100).optional(),
  wardId: z.string().uuid().optional().nullable(),
});

export const bedSchema = z.object({
  bedNumber: z.string().trim().min(1).max(50),
  status: z.enum(["available", "occupied", "maintenance", "reserved"]).optional(),
  wardId: z.string().uuid().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const serviceSchema = commonNamedSchema.extend({
  code: z.string().trim().max(50).optional().nullable(),
  price: z.coerce.number().nonnegative().optional(),
});

export const insuranceProviderSchema = commonNamedSchema.extend({
  code: z.string().trim().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
});

export const setupSchemas = {
  specialties: specialtySchema,
  wards: wardSchema,
  rooms: roomSchema,
  beds: bedSchema,
  services: serviceSchema,
  "insurance-providers": insuranceProviderSchema,
};

export type SetupResource = z.infer<typeof setupResourceSchema>;
