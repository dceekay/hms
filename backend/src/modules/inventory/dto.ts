import { z } from "zod";

const optionalText = (max = 150) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const listInventoryItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  stockStatus: z.enum(["all", "low", "out"]).optional(),
  category: z.string().trim().optional(),
  itemKind: z.enum(["all", "consumable", "appliance"]).optional(),
});

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(150),
  code: optionalText(50),
  category: optionalText(100),
  itemType: optionalText(80),
  description: optionalText(500),
  unit: z.string().trim().min(1).max(40).default("unit"),
  location: optionalText(150),
  department: optionalText(150),
  supplier: optionalText(150),
  serialNumber: optionalText(100),
  batchNumber: optionalText(80),
  costPrice: z.coerce.number().nonnegative().default(0),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  reorderLevel: z.coerce.number().int().nonnegative().default(5),
  isConsumable: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().optional(),
  notes: optionalText(500),
});

export const updateInventoryItemSchema = inventoryItemSchema.partial();

export const inventoryMovementSchema = z.object({
  movementType: z.enum(["stock_in", "stock_out", "adjustment", "damaged", "lost", "transfer"]),
  quantityChange: z.coerce.number().int().min(-100000).max(100000),
  reason: optionalText(255),
  destination: optionalText(150),
  issuedTo: optionalText(150),
  notes: optionalText(500),
});

export type ListInventoryItemsQueryDto = z.infer<typeof listInventoryItemsQuerySchema>;
export type InventoryItemDto = z.infer<typeof inventoryItemSchema>;
export type UpdateInventoryItemDto = z.infer<typeof updateInventoryItemSchema>;
export type InventoryMovementDto = z.infer<typeof inventoryMovementSchema>;
