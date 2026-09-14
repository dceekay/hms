import api from "./api";
import type {
  LaboratoryRequest,
  LaboratoryRequestFormValues,
  LaboratoryRequestStatus,
  LaboratoryResultFormValues,
  LaboratorySummary,
  LaboratoryTemplate,
  LaboratoryTemplateFormValues,
} from "../types/laboratory";
import {
  enqueueOfflineOperation,
  isLikelyNetworkError,
} from "../utils/offlineQueue";

type TemplateListResponse = {
  data: {
    items: LaboratoryTemplate[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type RequestListResponse = {
  data: {
    items: LaboratoryRequest[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: LaboratorySummary;
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanTemplatePayload(values: LaboratoryTemplateFormValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim() || undefined,
    category: values.category.trim() || undefined,
    specimen: values.specimen.trim() || undefined,
    reportTitle: values.reportTitle.trim() || undefined,
    notes: values.notes.trim() || undefined,
    isActive: values.isActive,
    fields: values.fields
      .filter((field) => field.key.trim() && field.label.trim())
      .map((field) => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        unit: field.unit?.trim() || undefined,
        referenceRange: field.referenceRange?.trim() || undefined,
        options: field.options?.filter(Boolean),
      })),
  };
}

const CACHE_KEY_TEMPLATES = "hms_cached_lab_templates";
const CACHE_KEY_REQUESTS = "hms_cached_lab_requests";
const OFFLINE_KEY_REQUESTS = "hms_offline_lab_requests";

function getCachedTemplates(): LaboratoryTemplate[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_TEMPLATES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCachedTemplates(templates: LaboratoryTemplate[]) {
  try {
    localStorage.setItem(CACHE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch {}
}

function getLocalOfflineRequests(): LaboratoryRequest[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY_REQUESTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOfflineRequest(req: LaboratoryRequest) {
  try {
    const list = getLocalOfflineRequests().filter((r) => r.id !== req.id);
    localStorage.setItem(OFFLINE_KEY_REQUESTS, JSON.stringify([req, ...list]));
  } catch {}
}

export async function fetchLaboratoryTemplates(search = "", activeOnly = false) {
  try {
    const response = await api.get<TemplateListResponse>("/laboratory/templates", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(activeOnly ? { activeOnly: true } : {}),
      },
    });

    if (response.data?.data?.items) {
      setCachedTemplates(response.data.data.items);
    }

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.warn("Laboratory templates fetch offline fallback:", error);
    const cached = getCachedTemplates();
    if (cached.length > 0) {
      const filtered = cached.filter((t) =>
        search ? t.name.toLowerCase().includes(search.toLowerCase()) : true
      );
      return {
        result: {
          items: filtered,
          meta: { page: 1, limit: 100, total: filtered.length, totalPages: 1 },
        },
        error: undefined,
      };
    }

    return {
      result: null,
      error: getErrorMessage(error, "Unable to load laboratory templates."),
    };
  }
}

export async function createLaboratoryTemplate(values: LaboratoryTemplateFormValues) {
  try {
    const response = await api.post<{ data: LaboratoryTemplate }>(
      "/laboratory/templates",
      cleanTemplatePayload(values)
    );

    return { template: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      template: null,
      error: getErrorMessage(error, "Unable to save laboratory template."),
    };
  }
}

export async function updateLaboratoryTemplate(id: string, values: LaboratoryTemplateFormValues) {
  try {
    const response = await api.patch<{ data: LaboratoryTemplate }>(
      `/laboratory/templates/${id}`,
      cleanTemplatePayload(values)
    );

    return { template: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      template: null,
      error: getErrorMessage(error, "Unable to update laboratory template."),
    };
  }
}

export async function deleteLaboratoryTemplate(id: string) {
  try {
    await api.delete(`/laboratory/templates/${id}`);
    return { success: true, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: getErrorMessage(error, "Unable to delete laboratory template."),
    };
  }
}

export async function fetchLaboratoryRequests(params: {
  search?: string;
  patientId?: string;
  status?: LaboratoryRequestStatus | "all";
} = {}) {
  try {
    const response = await api.get<RequestListResponse>("/laboratory/requests", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.patientId ? { patientId: params.patientId } : {}),
        ...(params.status && params.status !== "all" ? { status: params.status } : {}),
      },
    });

    if (response.data?.data?.items) {
      try {
        localStorage.setItem(CACHE_KEY_REQUESTS, JSON.stringify(response.data.data));
      } catch {}
    }

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.warn("Laboratory requests fetch offline fallback:", error);
    try {
      const raw = localStorage.getItem(CACHE_KEY_REQUESTS);
      const cached: RequestListResponse["data"] = raw
        ? JSON.parse(raw)
        : { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 }, summary: {} };

      const offlineItems = getLocalOfflineRequests();
      const mergedMap = new Map<string, LaboratoryRequest>();

      offlineItems.forEach((item) => mergedMap.set(item.id, item));
      cached.items.forEach((item) => {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      const filtered = mergedList.filter((item) => {
        if (params.status && params.status !== "all" && item.status !== params.status) {
          return false;
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          const pName = `${item.patient?.firstName ?? ""} ${item.patient?.lastName ?? ""}`.toLowerCase();
          return pName.includes(q) || item.requestNumber.toLowerCase().includes(q);
        }
        return true;
      });

      return {
        result: {
          items: filtered,
          meta: { page: 1, limit: 100, total: filtered.length, totalPages: 1 },
          summary: cached.summary || {},
        },
        error: undefined,
      };
    } catch {
      return {
        result: null,
        error: getErrorMessage(error, "Unable to load laboratory requests."),
      };
    }
  }
}

export async function createLaboratoryRequest(values: LaboratoryRequestFormValues) {
  const payload = {
    patientId: values.patientId ? values.patientId.trim() : undefined,
    templateId: values.templateId,
    clinicalNotes: values.clinicalNotes.trim() || undefined,
    manualPatientName: values.manualPatientName?.trim() || undefined,
    manualPatientGender: values.manualPatientGender || undefined,
    manualPatientPhone: values.manualPatientPhone?.trim() || undefined,
    manualPatientAge: values.manualPatientAge ? Number(values.manualPatientAge) : undefined,
  };

  try {
    const response = await api.post<{ data: LaboratoryRequest }>("/laboratory/requests", payload);
    return { request: response.data.data, error: undefined, queued: false };
  } catch (error: any) {
    console.error(error);

    if (isLikelyNetworkError(error)) {
      enqueueOfflineOperation({
        type: "laboratory.create_request",
        label: `Lab request for ${values.manualPatientName || "Patient"}`,
        method: "POST",
        path: "/laboratory/requests",
        body: payload,
      });

      const cachedTemplates = getCachedTemplates();
      const matchedTemplate = cachedTemplates.find((t) => t.id === values.templateId) || {
        id: values.templateId,
        name: "Diagnostic Investigation",
        fields: [],
        isActive: true,
      };

      const nowStr = new Date().toISOString();
      const offlineReq: LaboratoryRequest = {
        id: `offline-req-${Date.now()}`,
        requestNumber: `MDSL-${new Date().getFullYear()}-OFF${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        patientId: values.patientId || `walkin-${Date.now()}`,
        templateId: values.templateId,
        status: "pending",
        clinicalNotes: values.clinicalNotes,
        createdAt: nowStr,
        updatedAt: nowStr,
        patient: {
          id: values.patientId || `walkin-${Date.now()}`,
          firstName: values.manualPatientName?.split(" ")[0] || "Walk-in",
          lastName: values.manualPatientName?.split(" ").slice(1).join(" ") || "Patient",
          gender: values.manualPatientGender as any || "other",
          mrn: `CXLAB-OFF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        } as any,
        template: matchedTemplate as any,
      };

      saveLocalOfflineRequest(offlineReq);

      return {
        request: offlineReq,
        queued: true,
        error: undefined,
      };
    }

    return {
      request: null,
      queued: false,
      error: getErrorMessage(error, "Unable to create laboratory request."),
    };
  }
}

export async function updateLaboratoryRequestStatus(
  id: string,
  status: LaboratoryRequestStatus
) {
  const payload = {
    status,
    ...(status === "sample_collected" ? { sampleCollectedAt: new Date().toISOString() } : {}),
  };

  try {
    const response = await api.patch<{ data: LaboratoryRequest }>(`/laboratory/requests/${id}`, payload);
    return { request: response.data.data, error: undefined, queued: false };
  } catch (error: any) {
    console.error(error);

    if (isLikelyNetworkError(error)) {
      enqueueOfflineOperation({
        type: "laboratory.update_status",
        label: `Lab request status ${id} -> ${status}`,
        method: "PATCH",
        path: `/laboratory/requests/${id}`,
        body: payload,
      });

      const offlineList = getLocalOfflineRequests();
      const existing = offlineList.find((r) => r.id === id);
      if (existing) {
        const updated = {
          ...existing,
          status,
          ...(status === "sample_collected" ? { sampleCollectedAt: new Date().toISOString() } : {}),
        };
        saveLocalOfflineRequest(updated);
        return { request: updated, error: undefined, queued: true };
      }

      return { request: null, error: undefined, queued: true };
    }

    return {
      request: null,
      queued: false,
      error: getErrorMessage(error, "Unable to update laboratory request."),
    };
  }
}

export async function completeLaboratoryRequest(id: string, values: LaboratoryResultFormValues) {
  const payload = {
    resultValues: values.resultValues,
    interpretation: values.interpretation.trim() || undefined,
    technicianNote: values.technicianNote.trim() || undefined,
  };

  try {
    const response = await api.post<{ data: LaboratoryRequest }>(
      `/laboratory/requests/${id}/complete`,
      payload
    );

    return { request: response.data.data, error: undefined, queued: false };
  } catch (error: any) {
    console.error(error);

    if (isLikelyNetworkError(error)) {
      enqueueOfflineOperation({
        type: "laboratory.complete_result",
        label: `Lab result ${id}`,
        method: "POST",
        path: `/laboratory/requests/${id}/complete`,
        body: payload,
      });

      const offlineList = getLocalOfflineRequests();
      const existing = offlineList.find((r) => r.id === id);
      const updatedReq: LaboratoryRequest = existing
        ? {
            ...existing,
            status: "completed",
            resultValues: values.resultValues,
            interpretation: values.interpretation,
            technicianNote: values.technicianNote,
            completedAt: new Date().toISOString(),
          }
        : ({
            id,
            requestNumber: `MDSL-${id.slice(0, 8)}`,
            status: "completed",
            resultValues: values.resultValues,
            interpretation: values.interpretation,
            technicianNote: values.technicianNote,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            patient: { firstName: "Patient", lastName: "" } as any,
            template: { name: "Lab Test", fields: [] } as any,
          } as any);

      saveLocalOfflineRequest(updatedReq);

      return {
        request: updatedReq,
        queued: true,
        error: undefined,
      };
    }

    return {
      request: null,
      queued: false,
      error: getErrorMessage(error, "Unable to complete laboratory result."),
    };
  }
}

export type LaboratoryVerificationData = {
  id: string;
  requestNumber: string;
  status: LaboratoryRequestStatus;
  patient: {
    id: string;
    mrn?: string | null;
    fullName: string;
    gender: string;
    dateOfBirth?: string;
  };
  template: {
    id: string;
    name: string;
    code?: string | null;
    category?: string | null;
    specimen?: string | null;
    reportTitle?: string | null;
    fields: LaboratoryTemplate["fields"];
    notes?: string | null;
  };
  clinicalNotes?: string | null;
  sampleCollectedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  resultValues?: Record<string, unknown> | null;
  interpretation?: string | null;
  technicianNote?: string | null;
  technician?: {
    name: string;
    username: string;
  } | null;
  recordedBy?: {
    name: string;
    username: string;
  } | null;
  hospital: {
    name: string;
    address: string;
    phone: string;
    email: string;
    accreditation: string;
  };
};

export async function verifyLaboratoryRequestPublic(identifier: string) {
  try {
    const response = await api.get<{ data: LaboratoryVerificationData }>(
      `/laboratory/verify/${identifier}`
    );
    return { data: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      data: null,
      error: getErrorMessage(error, "Unable to verify laboratory test record."),
    };
  }
}
