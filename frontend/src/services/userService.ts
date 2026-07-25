import api from "./api";
import { AppUser, PaginatedResult } from "../types/rbac";

export type DoctorType = "medical_doctor" | "visiting_consultant" | "visiting_specialist";

export type CreateDoctorAccountValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  doctorType: DoctorType;
  specialty?: string;
};

export async function getUsers(search?: string): Promise<AppUser[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<AppUser> }>("/users", {
      params: {
        ...(search ? { search } : {}),
        limit: 100,
      },
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

export async function createDoctorAccount(values: CreateDoctorAccountValues): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const response = await api.post<{ data: AppUser }>("/users/doctors", values);
    return { user: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      user: null,
      error: error?.response?.data?.message ?? "Unable to create doctor account.",
    };
  }
}
