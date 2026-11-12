import api from "./api";
import axios from "axios";
import { AppUser, PaginatedResult } from "../types/rbac";
import type { User } from "../types/auth";

export type DoctorType = "medical_doctor" | "visiting_consultant" | "visiting_specialist";

export type CreateDoctorAccountValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  serviceAreaId?: string | null;
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
  serviceAreaId?: string | null;
  photoUrl?: string | null;
  photoDataUrl?: string | null;
  photoMimeType?: "image/webp" | "image/jpeg" | "image/png" | null;
  photoSizeBytes?: number | null;
  photoWidth?: number | null;
  photoHeight?: number | null;
  roleIds: string[];
};

export type UpdateUserAccountValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password?: string;
  phone?: string;
  serviceAreaId?: string | null;
  photoUrl?: string | null;
  photoDataUrl?: string | null;
  photoMimeType?: "image/webp" | "image/jpeg" | "image/png" | null;
  photoSizeBytes?: number | null;
  photoWidth?: number | null;
  photoHeight?: number | null;
};

export type UpdateOwnAccountValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
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

export async function updateOwnAccount(
  values: UpdateOwnAccountValues
): Promise<{ user: User | null; error?: string }> {
  try {
    const response = await api.patch<{ data: User }>("/users/me", values);
    return { user: response.data.data };
  } catch (error: any) {
    console.error(error);
    return {
      user: null,
      error: getErrorMessage(error, "Unable to update account settings."),
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

export type StaffVerification = {
  verified: boolean;
  staffId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoDataUrl?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  serviceArea?: {
    name: string;
    code?: string | null;
  } | null;
  roles: string[];
  doctorProfile?: {
    doctorType: DoctorType;
    specialty?: string | null;
  } | null;
  issueDate: string;
  expiresAt: string;
  verifiedAt: string;
  recordUpdatedAt: string;
};

export type StaffCardLookup = {
  id: string;
  staffId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  serviceArea?: {
    name: string;
    code?: string | null;
  } | null;
  roles: string[];
  issueDate: string;
  expiresAt: string;
  recordUpdatedAt: string;
};

const STAFF_CARD_CACHE_KEY = "hms_cached_staff_cards";

function readCachedStaffCards(): Record<string, StaffCardLookup> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STAFF_CARD_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StaffCardLookup>) : {};
  } catch {
    return {};
  }
}

function cacheStaffCard(staff: StaffCardLookup) {
  if (typeof window === "undefined" || !staff.staffId) return;
  try {
    const current = readCachedStaffCards();
    const key = staff.staffId.trim().toUpperCase().replace(/[\s-]/g, "");
    current[key] = staff;
    window.localStorage.setItem(STAFF_CARD_CACHE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

export async function lookupStaffByCardNumber(staffId: string): Promise<StaffCardLookup | null> {
  const normalizedKey = staffId.trim().toUpperCase().replace(/[\s-]/g, "");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return readCachedStaffCards()[normalizedKey] ?? null;
  }

  try {
    const response = await api.get<{ data: StaffCardLookup }>(
      `/users/staff-lookup/${encodeURIComponent(staffId)}`
    );
    if (response.data.data) {
      cacheStaffCard(response.data.data);
    }
    return response.data.data;
  } catch (error) {
    console.error(error);
    return readCachedStaffCards()[normalizedKey] ?? null;
  }
}

export async function verifyStaffPublic(id: string): Promise<StaffVerification | null> {
  try {
    const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";
    const response = await axios.get<{ data: StaffVerification }>(`${baseURL.replace(/\/$/, "")}/users/verify/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
