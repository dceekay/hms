import api from "./api";
import { Role, PaginatedResult } from "../types/rbac";

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
}): Promise<Role | null> {
  try {
    const response = await api.post<{ data: Role }>("/roles", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateRole(
  id: string,
  values: { name?: string; description?: string }
): Promise<Role | null> {
  try {
    const response = await api.patch<{ data: Role }>(`/roles/${id}`, values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function assignPermissionsToRole(
  id: string,
  permissionIds: string[]
): Promise<Role | null> {
  try {
    const response = await api.post<{ data: Role }>(`/roles/${id}/permissions`, {
      permissionIds,
    });
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deleteRole(id: string): Promise<boolean> {
  try {
    await api.delete(`/roles/${id}`);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}