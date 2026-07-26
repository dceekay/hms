import api from "../services/api";

export type DashboardOverview = {
  generatedAt: string;
  patients: {
    total: number;
    active: number;
    inactive: number;
    registeredToday: number;
    categories: {
      newPatients: number;
      oldPatients: number;
      investigationPatients: number;
    };
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    doctorsAvailable: number;
    availableDoctors: Array<{
      id: string;
      name: string;
      username: string;
      phone?: string | null;
      specialty?: string | null;
      doctorType?: string | null;
      serviceArea?: string | null;
    }>;
    byService: Array<{
      id: string;
      name: string;
      code?: string | null;
      activeUsers: number;
      totalUsers: number;
    }>;
  };
  setup: {
    activeServices: number;
    insuranceProviders: number;
    services: Array<{
      id: string;
      name: string;
      code?: string | null;
      price?: number | string | null;
      isActive: boolean;
    }>;
  };
  billing: {
    totalBills: number;
    pendingBills: number;
    paidBills: number;
    pendingAmount: number | string;
    paidAmount: number | string;
    monthBillCount: number;
    monthAmount: number | string;
    serviceRevenue: Array<{
      id: string;
      name: string;
      code?: string | null;
      billCount: number;
      totalAmount: number;
    }>;
  };
  operations: {
    semsas: {
      total: number;
      unfiled: number;
      filedThisMonth: number;
      filedAmountThisMonth: number | string;
      unfiledAmount: number | string;
    };
    security: {
      currentlyInside: number;
    };
    beds: {
      total: number;
      available: number;
      occupied: number;
    };
  };
  recent: {
    patients: Array<{
      id: string;
      mrn?: string | null;
      name: string;
      category: string;
      status: string;
      insuranceProvider?: string | null;
      createdAt: string;
    }>;
    bills: Array<{
      id: string;
      invoiceNumber: string;
      patientName: string;
      serviceName: string;
      paymentStatus: string;
      totalAmount: number | string;
      billedAt: string;
      recordedBy?: string | null;
    }>;
    semsas: Array<{
      id: string;
      patientName: string;
      transferType: string;
      feeAmount: number | string;
      filedAt?: string | null;
      transferDate: string;
    }>;
  };
};

export async function fetchDashboardOverview(): Promise<DashboardOverview | null> {
  try {
    const response = await api.get<{ data: DashboardOverview }>("/dashboard/overview");
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
