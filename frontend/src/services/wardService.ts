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
  try {
    const response = await api.get<{ data: WardDashboard }>("/wards/dashboard");
    return { dashboard: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { dashboard: null, error: getApiErrorMessage(error) };
  }
}

export async function assignPatientToBed(values: WardAssignmentFormValues) {
  try {
    const response = await api.post<{ data: WardBedAssignment }>(
      "/wards/assignments",
      cleanAssignmentPayload(values)
    );
    return { assignment: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { assignment: null, error: getApiErrorMessage(error) };
  }
}

export async function dischargeWardAssignment(id: string) {
  try {
    const response = await api.patch<{ data: WardBedAssignment }>(`/wards/assignments/${id}/discharge`, {
      nextBedStatus: "cleaning",
    });
    return { assignment: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { assignment: null, error: getApiErrorMessage(error) };
  }
}

export async function updateWardBedStatus(id: string, status: Exclude<BedStatus, "occupied">) {
  try {
    const response = await api.patch<{ data: WardBed }>(`/wards/beds/${id}/status`, { status });
    return { bed: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { bed: null, error: getApiErrorMessage(error) };
  }
}

export async function createWard(values: WardFormValues) {
  try {
    const response = await api.post<{ data: WardSummaryBase }>("/setup/wards", cleanWardPayload(values));
    return { ward: response.data.data, error: undefined };
  } catch (error) {
    console.error(error);
    return { ward: null, error: getApiErrorMessage(error) };
  }
}
