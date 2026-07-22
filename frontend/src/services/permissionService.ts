import api from "./api";
import { Permission, PaginatedResult } from "../types/rbac";

export async function getPermissions(): Promise<Permission[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<Permission> }>("/permissions");
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createPermission(values: {
  name: string;
  description?: string;
}): Promise<Permission | null> {
  try {
    const response = await api.post<{ data: Permission }>("/permissions", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updatePermission(
  id: string,
  values: { name?: string; description?: string }
): Promise<Permission | null> {
  try {
    const response = await api.patch<{ data: Permission }>(`/permissions/${id}`, values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deletePermission(id: string): Promise<boolean> {
  try {
    await api.delete(`/permissions/${id}`);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}