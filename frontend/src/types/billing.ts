import { Patient } from "./patient";
import { HospitalService } from "./setup";
import { AppUser } from "./rbac";

export type BillPaymentStatus = "pending" | "paid" | "cancelled";

export type PatientBill = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  paymentStatus: BillPaymentStatus;
  notes?: string | null;
  billedAt: string;
  patient: Patient;
  service: HospitalService;
  recordedBy?: Pick<AppUser, "id" | "firstName" | "lastName" | "username"> | null;
};

export type PatientBillFormValues = {
  patientId: string;
  serviceId: string;
  quantity: string;
  unitPrice: string;
  amountPaid: string;
  paymentStatus: BillPaymentStatus;
  notes: string;
};
