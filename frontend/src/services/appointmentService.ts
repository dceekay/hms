import api from "./api";
import type {
  Appointment,
  AppointmentFormValues,
  AppointmentStatus,
  AppointmentSummary,
} from "../types/appointment";
import type { AppUser } from "../types/rbac";
import { notifyDataMutated } from "../utils/appEvents";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

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
  const payload = cleanAppointmentPayload(values);

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "appointments.book_appointment",
      label: "Book Appointment",
      method: "POST",
      path: "/appointments",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/appointments", source: "appointments-offline" });
    return {
      appointment: {
        id: `offline-appt-${Date.now()}`,
        patientId: values.patientId,
        doctorId: values.doctorId,
        scheduledFor: values.scheduledFor || new Date().toISOString(),
        status: "scheduled",
        reason: values.reason,
        notes: values.notes,
        createdAt: new Date().toISOString(),
      } as unknown as Appointment,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: Appointment }>(
      "/appointments",
      payload
    );

    notifyDataMutated({ method: "POST", url: "/appointments", source: "appointments" });
    return { appointment: response.data.data, error: undefined, queued: false };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      appointment: null,
      error: getErrorMessage(error, "Unable to schedule appointment."),
      queued: false,
    };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  notes = ""
) {
  const payload = {
    status,
    notes: notes.trim() || undefined,
  };

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "appointments.update_status",
      label: `Appointment Status: ${status}`,
      method: "PATCH",
      path: `/appointments/${id}/status`,
      body: payload,
    });
    notifyDataMutated({
      method: "PATCH",
      url: `/appointments/${id}/status`,
      source: "appointments-offline",
    });
    return {
      appointment: {
        id,
        status,
        notes: payload.notes,
      } as unknown as Appointment,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.patch<{ data: Appointment }>(
      `/appointments/${id}/status`,
      payload
    );

    notifyDataMutated({
      method: "PATCH",
      url: `/appointments/${id}/status`,
      source: "appointments",
    });
    return { appointment: response.data.data, error: undefined };
  } catch (error: any) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return {
      appointment: null,
      error: getErrorMessage(error, "Unable to update appointment."),
    };
  }
}
