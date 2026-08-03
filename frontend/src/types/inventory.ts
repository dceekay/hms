import type { AppUser } from "./rbac";

export type InventoryStockStatus = "all" | "low" | "out";
export type InventoryItemKind = "all" | "consumable" | "appliance";
export type InventoryMovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "damaged"
  | "lost"
  | "transfer";

export type InventoryItem = {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  itemType?: string | null;
  description?: string | null;
  unit: string;
  location?: string | null;
  department?: string | null;
  supplier?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  costPrice: number | string;
  currentStock: number;
  reorderLevel: number;
  isConsumable: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryMovement = {
  id: string;
  itemId: string;
  movementType: InventoryMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason?: string | null;
  destination?: string | null;
  issuedTo?: string | null;
  notes?: string | null;
  createdAt: string;
  item: InventoryItem;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type InventoryItemFormValues = {
  name: string;
  code: string;
  category: string;
  itemType: string;
  description: string;
  unit: string;
  location: string;
  department: string;
  supplier: string;
  serialNumber: string;
  batchNumber: string;
  costPrice: string;
  currentStock: string;
  reorderLevel: string;
  isConsumable: boolean;
  isActive: boolean;
  notes: string;
};

export type InventoryMovementFormValues = {
  itemId: string;
  movementType: InventoryMovementType;
  quantityChange: string;
  reason: string;
  destination: string;
  issuedTo: string;
  notes: string;
};

export type InventorySummary = {
  active: number;
  lowStock: number;
  outOfStock: number;
  consumables: number;
  appliances: number;
  categories: string[];
};
