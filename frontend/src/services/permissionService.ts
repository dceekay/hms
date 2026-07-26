import api from "./api";
import { Permission, PaginatedResult } from "../types/rbac";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export async function getPermissions(): Promise<Permission[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<Permission> }>("/permissions", {
      params: { limit: 500 },
    });
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createPermission(values: {
  name: string;
  description?: string;
}): Promise<{ permission: Permission | null; error?: string }> {
  try {
    const response = await api.post<{ data: Permission }>("/permissions", values);
    return { permission: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      permission: null,
      error: getErrorMessage(error, "Unable to create permission."),
    };
  }
}

export async function updatePermission(
  id: string,
  values: { name?: string; description?: string }
): Promise<{ permission: Permission | null; error?: string }> {
  try {
    const response = await api.patch<{ data: Permission }>(`/permissions/${id}`, values);
    return { permission: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      permission: null,
      error: getErrorMessage(error, "Unable to update permission."),
    };
  }
}

export async function deletePermission(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/permissions/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: getErrorMessage(error, "Unable to delete permission."),
    };
  }
}
