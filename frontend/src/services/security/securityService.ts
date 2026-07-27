import api from "../api";
import { SecurityEntryFormValues, SecurityEntryLog } from "../../types/security";

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

export async function fetchSecurityEntries(search = ""): Promise<SecurityEntryLog[] | null> {
  try {
    const response = await api.get<{ data: { items: SecurityEntryLog[] } }>("/security/entry-logs", {
      params: {
        take: 50,
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
