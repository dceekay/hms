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

export type CreateUserAccountValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  roleIds: string[];
};

export type UpdateUserAccountValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export async function getUsers(search?: string, isActive?: boolean): Promise<AppUser[] | null> {
  try {
    const response = await api.get<{ data: PaginatedResult<AppUser> }>("/users", {
      params: {
        ...(search ? { search } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        limit: 100,
      },
    });
    return response.data.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createUserAccount(values: CreateUserAccountValues): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const response = await api.post<{ data: AppUser }>("/users", values);
    return { user: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      user: null,
      error: getErrorMessage(error, "Unable to create user account."),
    };
  }
}

export async function updateUserAccount(
  id: string,
  values: UpdateUserAccountValues
): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const response = await api.patch<{ data: AppUser }>(`/users/${id}`, values);
    return { user: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      user: null,
      error: getErrorMessage(error, "Unable to update user account."),
    };
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
): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const response = await api.post<{ data: AppUser }>(`/users/${id}/roles`, { roleIds });
    return { user: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      user: null,
      error: getErrorMessage(error, "Unable to assign roles."),
    };
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
      error: getErrorMessage(error, "Unable to create doctor account."),
    };
  }
}
