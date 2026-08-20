import api from "./api";
import type {
  Appointment,
  AppointmentFormValues,
  AppointmentStatus,
  AppointmentSummary,
} from "../types/appointment";
import type { AppUser } from "../types/rbac";

type AppointmentListResponse = {
  data: {
    items: Appointment[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: AppointmentSummary;
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanAppointmentPayload(values: AppointmentFormValues) {
  return {
    patientId: values.patientId,
    doctorId: values.doctorId,
    scheduledFor: values.scheduledFor || undefined,
    reason: values.reason.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchAppointmentDoctors() {
  try {
    const response = await api.get<{ data: AppUser[] }>("/appointments/doctors");
    return { doctors: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      doctors: null,
      error: getErrorMessage(error, "Unable to load doctors."),
    };
  }
}

export async function fetchAppointments(params: {
  search?: string;
  patientId?: string;
  doctorId?: string;
  mine?: boolean;
  status?: AppointmentStatus | "all";
  date?: string;
} = {}) {
  try {
    const response = await api.get<AppointmentListResponse>("/appointments", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.patientId ? { patientId: params.patientId } : {}),
        ...(params.doctorId ? { doctorId: params.doctorId } : {}),
        ...(params.mine ? { mine: true } : {}),
        ...(params.status && params.status !== "all" ? { status: params.status } : {}),
        ...(params.date ? { date: params.date } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load appointments."),
    };
  }
}

export async function createAppointment(values: AppointmentFormValues) {
  try {
    const response = await api.post<{ data: Appointment }>(
      "/appointments",
      cleanAppointmentPayload(values)
    );

    return { appointment: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      appointment: null,
      error: getErrorMessage(error, "Unable to schedule appointment."),
    };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  notes = ""
) {
  try {
    const response = await api.patch<{ data: Appointment }>(`/appointments/${id}/status`, {
      status,
      notes: notes.trim() || undefined,
    });

    return { appointment: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      appointment: null,
      error: getErrorMessage(error, "Unable to update appointment."),
    };
  }
}
