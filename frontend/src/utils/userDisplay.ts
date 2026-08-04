import type { User } from "../types/auth";

export function getUserDisplayName(user?: Pick<User, "firstName" | "lastName" | "roles"> | null) {
  const roles = user?.roles ?? [];
  const isSuperAdmin = roles.some((role) => role.toLowerCase() === "super admin");

  if (isSuperAdmin) {
    return "Dr Abdulkadir Yakubu";
  }

  const firstName = user?.firstName?.trim() ?? "";
  const lastName = user?.lastName?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || "Administrator";
}
