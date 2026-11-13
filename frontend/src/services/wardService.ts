import axios from "axios";
import api from "./api";
import {
  BedStatus,
  WardAssignmentFormValues,
  WardBed,
  WardBedAssignment,
  WardDashboard,
  WardFormValues,
  WardSummaryBase,
} from "../types/ward";
import { notifyDataMutated } from "../utils/appEvents";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

const WARD_DASHBOARD_CACHE_KEY = "hms_cached_ward_dashboard";

type ApiErrorBody = {
  message?: string;
};

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

function cleanAssignmentPayload(values: WardAssignmentFormValues) {
  return {
    patientId: values.patientId,
    bedId: values.bedId,
    doctorId: values.doctorId || undefined,
    admissionRequestId: values.admissionRequestId || undefined,
    priority: values.priority,
    diagnosis: values.diagnosis.trim() || undefined,
    reason: values.reason.trim(),
    notes: values.notes.trim() || undefined,
    expectedDischargeAt: values.expectedDischargeAt || undefined,
  };
}

function cleanWardPayload(values: WardFormValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim() || null,
    department: values.department.trim() || null,
    building: values.building.trim() || null,
    floor: values.floor.trim() || null,
    wardType: values.wardType.trim() || null,
    nurseStation: values.nurseStation.trim() || null,
    wardManager: values.wardManager.trim() || null,
    contactNumber: values.contactNumber.trim() || null,
    description: values.description.trim() || undefined,
    isActive: true,
  };
}

export async function fetchWardDashboard() {
  const readCached = (): WardDashboard | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(WARD_DASHBOARD_CACHE_KEY);
      return raw ? (JSON.parse(raw) as WardDashboard) : null;
    } catch {
      return null;
    }
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readCached();
    if (cached) return { dashboard: cached, error: undefined };
  }

  try {
    const response = await api.get<{ data: WardDashboard }>("/wards/dashboard");
    try {
      window.localStorage.setItem(WARD_DASHBOARD_CACHE_KEY, JSON.stringify(response.data.data));
    } catch {
      // Ignore storage quota errors
    }
    return { dashboard: response.data.data, error: undefined };
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      const cached = readCached();
      if (cached) return { dashboard: cached, error: undefined };
    }
    console.error(error);
    return { dashboard: null, error: getApiErrorMessage(error) };
  }
}

export async function assignPatientToBed(values: WardAssignmentFormValues) {
  const payload = cleanAssignmentPayload(values);

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "wards.assign_bed",
      label: "Admit / Assign Patient to Bed",
      method: "POST",
      path: "/wards/assignments",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/wards/assignments", source: "wards-offline" });
    return {
      assignment: {
        id: `offline-assign-${Date.now()}`,
        patientId: payload.patientId,
        bedId: payload.bedId,
        status: "active",
        admittedAt: new Date().toISOString(),
      } as unknown as WardBedAssignment,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: WardBedAssignment }>(
      "/wards/assignments",
      payload
    );
    notifyDataMutated({ method: "POST", url: "/wards/assignments", source: "wards" });
    return { assignment: response.data.data, error: undefined };
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return { assignment: null, error: getApiErrorMessage(error) };
  }
}

export async function dischargeWardAssignment(id: string) {
  const payload = { nextBedStatus: "cleaning" };

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "wards.discharge_bed",
      label: "Discharge Patient from Bed",
      method: "PATCH",
      path: `/wards/assignments/${id}/discharge`,
      body: payload,
    });
    notifyDataMutated({
      method: "PATCH",
      url: `/wards/assignments/${id}/discharge`,
      source: "wards-offline",
    });
    return {
      assignment: {
        id,
        status: "discharged",
        dischargedAt: new Date().toISOString(),
      } as unknown as WardBedAssignment,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.patch<{ data: WardBedAssignment }>(`/wards/assignments/${id}/discharge`, payload);
    notifyDataMutated({
      method: "PATCH",
      url: `/wards/assignments/${id}/discharge`,
      source: "wards",
    });
    return { assignment: response.data.data, error: undefined };
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return { assignment: null, error: getApiErrorMessage(error) };
  }
}

export async function updateWardBedStatus(id: string, status: Exclude<BedStatus, "occupied">) {
  const payload = { status };

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "wards.update_bed_status",
      label: `Bed Status: ${status}`,
      method: "PATCH",
      path: `/wards/beds/${id}/status`,
      body: payload,
    });
    notifyDataMutated({
      method: "PATCH",
      url: `/wards/beds/${id}/status`,
      source: "wards-offline",
    });
    return {
      bed: { id, status } as unknown as WardBed,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.patch<{ data: WardBed }>(`/wards/beds/${id}/status`, payload);
    notifyDataMutated({
      method: "PATCH",
      url: `/wards/beds/${id}/status`,
      source: "wards",
    });
    return { bed: response.data.data, error: undefined };
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return { bed: null, error: getApiErrorMessage(error) };
  }
}

export async function createWard(values: WardFormValues) {
  const payload = cleanWardPayload(values);

  const queueOffline = () => {
    enqueueOfflineOperation({
      type: "wards.create_ward",
      label: `Create Ward: ${values.name}`,
      method: "POST",
      path: "/setup/wards",
      body: payload,
    });
    notifyDataMutated({ method: "POST", url: "/setup/wards", source: "wards-offline" });
    return {
      ward: {
        id: `offline-ward-${Date.now()}`,
        name: values.name,
        code: values.code,
      } as unknown as WardSummaryBase,
      error: undefined,
      queued: true,
    };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueOffline();
  }

  try {
    const response = await api.post<{ data: WardSummaryBase }>("/setup/wards", payload);
    notifyDataMutated({ method: "POST", url: "/setup/wards", source: "wards" });
    return { ward: response.data.data, error: undefined };
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      return queueOffline();
    }
    console.error(error);
    return { ward: null, error: getApiErrorMessage(error) };
  }
}
