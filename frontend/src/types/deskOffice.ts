import type { InsuranceProvider } from "./setup";

export type InsuranceClaimRecorder = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

export type InsuranceClaim = {
  id: string;
  claimNumber: string;
  insuranceProviderId: string;
  insuranceProvider: InsuranceProvider;
  amountClaimed: number | string;
  amountProvided: number | string;
  claimDate: string;
  providedDate?: string | null;
  notes?: string | null;
  recordedBy?: InsuranceClaimRecorder | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InsuranceClaimFormValues = {
  insuranceProviderId: string;
  amountClaimed: string;
  amountProvided: string;
  claimDate: string;
  providedDate: string;
  notes: string;
};

export type DeskOfficeProviderSummary = {
  insuranceProviderId: string;
  insuranceProvider: InsuranceProvider | null;
  totalClaims: number;
  amountClaimed: number | string;
  amountProvided: number | string;
  outstandingAmount: number | string;
};

export type DeskOfficeDashboard = {
  items: InsuranceClaim[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalClaims: number;
    amountClaimed: number | string;
    amountProvided: number | string;
    outstandingAmount: number | string;
  };
  providerSummary: DeskOfficeProviderSummary[];
};
