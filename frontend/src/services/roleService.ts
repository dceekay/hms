import api from "./api";
import { Role, PaginatedResult } from "../types/rbac";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export async function getRoles(): Promise<Role[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<Role> }>("/roles");
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getRoleById(id: string): Promise<Role | null> {
  try {
    const response = await api.get<{ data: Role }>(`/roles/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createRole(values: {
  name: string;
  description?: string;
  permissionIds?: string[];
}): Promise<{ role: Role | null; error?: string }> {
  try {
    const response = await api.post<{ data: Role }>("/roles", values);
    return { role: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      role: null,
      error: getErrorMessage(error, "Unable to create role."),
    };
  }
}

export async function updateRole(
  id: string,
  values: { name?: string; description?: string; permissionIds?: string[] }
): Promise<{ role: Role | null; error?: string }> {
  try {
    const response = await api.patch<{ data: Role }>(`/roles/${id}`, values);
    return { role: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      role: null,
      error: getErrorMessage(error, "Unable to update role."),
    };
  }
}

export async function assignPermissionsToRole(
  id: string,
  permissionIds: string[]
): Promise<{ role: Role | null; error?: string }> {
  try {
    const response = await api.post<{ data: Role }>(`/roles/${id}/permissions`, {
      permissionIds,
    });
    return { role: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      role: null,
      error: getErrorMessage(error, "Unable to assign permissions."),
    };
  }
}

export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/roles/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: getErrorMessage(error, "Unable to delete role."),
    };
  }
}
