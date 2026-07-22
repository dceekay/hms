import api from "./api";
import { AppUser, PaginatedResult } from "../types/rbac";

export async function getUsers(search?: string): Promise<AppUser[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<AppUser> }>("/users", {
      params: search ? { search } : undefined,
    });
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getUserById(id: string): Promise<AppUser | null> {
  try {
    const response = await api.get<{ data: AppUser }>(`/users/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function assignRolesToUser(
  id: string,
  roleIds: string[]
): Promise<AppUser | null> {
  try {
    const response = await api.post<{ data: AppUser }>(`/users/${id}/roles`, { roleIds });
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function activateUser(id: string): Promise<AppUser | null> {
  try {
    const response = await api.post<{ data: AppUser }>(`/users/${id}/activate`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deactivateUser(id: string): Promise<AppUser | null> {
  try {
    const response = await api.post<{ data: AppUser }>(`/users/${id}/deactivate`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await api.delete(`/users/${id}`);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}