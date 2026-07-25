export type InsuranceProvider = {
  id: string;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  patientPayPercentage?: number | string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InsuranceProviderFormValues = {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  patientPayPercentage: string;
  isActive: boolean;
};
