import type { Patient } from "./patient";
import type { AppUser } from "./rbac";

export type PharmacyPaymentStatus = "pending" | "paid" | "cancelled";
export type PharmacyStockStatus = "all" | "low" | "out" | "expired";
export type PharmacyMovementType = "stock_in" | "adjustment" | "dispense";

export type Medication = {
  id: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  category?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  unit: string;
  sellingPrice: number | string;
  costPrice: number | string;
  currentStock: number;
  reorderLevel: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PharmacyDispense = {
  id: string;
  invoiceNumber: string;
  medicationId: string;
  patientId: string;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  paymentStatus: PharmacyPaymentStatus;
  instructions?: string | null;
  notes?: string | null;
  dispensedAt: string;
  medication: Medication;
  patient: Patient;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type PharmacySaleItem = {
  id: string;
  saleId: string;
  medicationId: string;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  instructions?: string | null;
  medication: Medication;
};

export type PharmacySale = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  subtotalAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  paymentStatus: PharmacyPaymentStatus;
  notes?: string | null;
  soldAt: string;
  patient: Patient;
  items: PharmacySaleItem[];
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type PharmacyStockMovement = {
  id: string;
  medicationId: string;
  movementType: PharmacyMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  medication: Medication;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type PharmacySaleCartItem = {
  medicationId: string;
  quantity: string;
  unitPrice: string;
  instructions: string;
};

export type PharmacySaleFormValues = {
  patientId: string;
  discountAmount: string;
  amountPaid: string;
  paymentStatus: PharmacyPaymentStatus;
  notes: string;
  items: PharmacySaleCartItem[];
};

export type MedicationFormValues = {
  name: string;
  genericName: string;
  brandName: string;
  category: string;
  strength: string;
  dosageForm: string;
  unit: string;
  sellingPrice: string;
  costPrice: string;
  currentStock: string;
  reorderLevel: string;
  batchNumber: string;
  expiryDate: string;
  isActive: boolean;
};

export type PharmacyDispenseFormValues = {
  patientId: string;
  medicationId: string;
  quantity: string;
  unitPrice: string;
  amountPaid: string;
  paymentStatus: PharmacyPaymentStatus;
  instructions: string;
  notes: string;
};

export type PharmacySummary = {
  active: number;
  lowStock: number;
  outOfStock: number;
  expired: number;
};
