import api from "../services/api";

export type DashboardOverview = {
  revenue: number;
  patientsToday: number;
  admissions: number;
  doctorsAvailable: number;
  occupiedBeds: number;
  pendingBills: number;
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
