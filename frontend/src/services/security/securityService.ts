import api from "../api";
import type { SecurityEntryFormValues, SecurityEntryLog } from "../../types/security";

export async function createSecurityEntry(
  values: SecurityEntryFormValues
): Promise<SecurityEntryLog | null> {
  try {
    const response = await api.post<{ data: SecurityEntryLog }>("/security/entry-logs", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchSecurityEntries(
  search = "",
  options: {
    activeOnly?: boolean;
    take?: number;
  } = {}
): Promise<SecurityEntryLog[] | null> {
  try {
    const response = await api.get<{ data: { items: SecurityEntryLog[] } }>("/security/entry-logs", {
      params: {
        take: options.take ?? 50,
        ...(options.activeOnly !== undefined
          ? { activeOnly: options.activeOnly }
          : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      },
    });

    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function checkoutSecurityEntry(id: string): Promise<SecurityEntryLog | null> {
  try {
    const response = await api.post<{ data: SecurityEntryLog }>(`/security/entry-logs/${id}/checkout`, {});
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
