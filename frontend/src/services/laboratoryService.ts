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

export async function fetchLaboratoryTemplates(search = "", activeOnly = false) {
  try {
    const response = await api.get<TemplateListResponse>("/laboratory/templates", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(activeOnly ? { activeOnly: true } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
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

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load laboratory requests."),
    };
  }
}

export async function createLaboratoryRequest(values: LaboratoryRequestFormValues) {
  try {
    const response = await api.post<{ data: LaboratoryRequest }>("/laboratory/requests", {
      patientId: values.patientId,
      templateId: values.templateId,
      clinicalNotes: values.clinicalNotes.trim() || undefined,
    });

    return { request: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      request: null,
      error: getErrorMessage(error, "Unable to create laboratory request."),
    };
  }
}

export async function updateLaboratoryRequestStatus(
  id: string,
  status: LaboratoryRequestStatus
) {
  try {
    const response = await api.patch<{ data: LaboratoryRequest }>(`/laboratory/requests/${id}`, {
      status,
      ...(status === "sample_collected" ? { sampleCollectedAt: new Date().toISOString() } : {}),
    });

    return { request: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      request: null,
      error: getErrorMessage(error, "Unable to update laboratory request."),
    };
  }
}

export async function completeLaboratoryRequest(id: string, values: LaboratoryResultFormValues) {
  try {
    const response = await api.post<{ data: LaboratoryRequest }>(
      `/laboratory/requests/${id}/complete`,
      {
        resultValues: values.resultValues,
        interpretation: values.interpretation.trim() || undefined,
        technicianNote: values.technicianNote.trim() || undefined,
      }
    );

    return { request: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      request: null,
      error: getErrorMessage(error, "Unable to complete laboratory result."),
    };
  }
}
