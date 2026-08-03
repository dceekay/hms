import api from "./api";
import type {
  Medication,
  MedicationFormValues,
  PharmacyDispense,
  PharmacyDispenseFormValues,
  PharmacySale,
  PharmacySaleFormValues,
  PharmacyStockMovement,
  PharmacyStockStatus,
  PharmacySummary,
} from "../types/pharmacy";

type MedicationListResponse = {
  data: {
    items: Medication[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: PharmacySummary;
  };
};

type DispenseListResponse = {
  data: {
    items: PharmacyDispense[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type SaleListResponse = {
  data: {
    items: PharmacySale[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      paidAmount: number | string;
      pendingAmount: number | string;
    };
  };
};

type StockMovementListResponse = {
  data: {
    items: PharmacyStockMovement[];
    total: number;
  };
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

function cleanMedicationPayload(values: MedicationFormValues) {
  return {
    name: values.name.trim(),
    genericName: values.genericName.trim() || undefined,
    brandName: values.brandName.trim() || undefined,
    category: values.category.trim() || undefined,
    strength: values.strength.trim() || undefined,
    dosageForm: values.dosageForm.trim() || undefined,
    unit: values.unit.trim() || "unit",
    sellingPrice: Number(values.sellingPrice || 0),
    costPrice: Number(values.costPrice || 0),
    currentStock: Number(values.currentStock || 0),
    reorderLevel: Number(values.reorderLevel || 0),
    batchNumber: values.batchNumber.trim() || undefined,
    expiryDate: values.expiryDate || undefined,
    isActive: values.isActive,
  };
}

function cleanDispensePayload(values: PharmacyDispenseFormValues) {
  return {
    patientId: values.patientId,
    medicationId: values.medicationId,
    quantity: Number(values.quantity || 1),
    unitPrice: Number(values.unitPrice || 0),
    amountPaid: Number(values.amountPaid || 0),
    paymentStatus: values.paymentStatus,
    instructions: values.instructions.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

function cleanSalePayload(values: PharmacySaleFormValues) {
  return {
    patientId: values.patientId,
    items: values.items.map((item) => ({
      medicationId: item.medicationId,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      instructions: item.instructions.trim() || undefined,
    })),
    discountAmount: Number(values.discountAmount || 0),
    amountPaid: Number(values.amountPaid || 0),
    paymentStatus: values.paymentStatus,
    notes: values.notes.trim() || undefined,
  };
}

export async function fetchMedications(params: {
  search?: string;
  stockStatus?: PharmacyStockStatus;
} = {}) {
  try {
    const response = await api.get<MedicationListResponse>("/pharmacy/medications", {
      params: {
        limit: 100,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.stockStatus && params.stockStatus !== "all"
          ? { stockStatus: params.stockStatus }
          : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load medications."),
    };
  }
}

export async function createMedication(values: MedicationFormValues) {
  try {
    const response = await api.post<{ data: Medication }>(
      "/pharmacy/medications",
      cleanMedicationPayload(values)
    );

    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to create medication."),
    };
  }
}

export async function updateMedication(id: string, values: MedicationFormValues) {
  try {
    const response = await api.patch<{ data: Medication }>(
      `/pharmacy/medications/${id}`,
      cleanMedicationPayload(values)
    );

    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to update medication."),
    };
  }
}

export async function adjustMedicationStock(id: string, values: {
  quantityChange: number;
  reason?: string;
  notes?: string;
}) {
  try {
    const response = await api.post<{ data: Medication }>(
      `/pharmacy/medications/${id}/stock`,
      values
    );

    return { medication: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      medication: null,
      error: getErrorMessage(error, "Unable to update stock."),
    };
  }
}

export async function fetchPharmacyDispenses(search = "") {
  try {
    const response = await api.get<DispenseListResponse>("/pharmacy/dispenses", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy invoices."),
    };
  }
}

export async function dispenseMedication(values: PharmacyDispenseFormValues) {
  try {
    const response = await api.post<{ data: PharmacyDispense }>(
      "/pharmacy/dispenses",
      cleanDispensePayload(values)
    );

    return { dispense: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      dispense: null,
      error: getErrorMessage(error, "Unable to dispense medication."),
    };
  }
}

export async function fetchPharmacySales(search = "") {
  try {
    const response = await api.get<SaleListResponse>("/pharmacy/sales", {
      params: {
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy sales."),
    };
  }
}

export async function createPharmacySale(values: PharmacySaleFormValues) {
  try {
    const response = await api.post<{ data: PharmacySale }>(
      "/pharmacy/sales",
      cleanSalePayload(values)
    );

    return { sale: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      sale: null,
      error: getErrorMessage(error, "Unable to complete pharmacy sale."),
    };
  }
}

export async function fetchPharmacyStockMovements(medicationId?: string) {
  try {
    const response = await api.get<StockMovementListResponse>("/pharmacy/stock-movements", {
      params: {
        limit: 100,
        ...(medicationId ? { medicationId } : {}),
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load pharmacy stock movements."),
    };
  }
}
