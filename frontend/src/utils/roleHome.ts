export function getRoleHomePath(roles: string[] = []) {
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (normalizedRoles.includes("doctor")) return "/doctor";
  if (normalizedRoles.includes("nurse")) return "/nurse";
  if (normalizedRoles.includes("laboratory")) return "/laboratory";
  if (normalizedRoles.includes("pharmacist") || normalizedRoles.includes("pharmacy")) {
    return "/pharmacy";
  }
  if (
    normalizedRoles.includes("receptionist") ||
    normalizedRoles.includes("reception") ||
    normalizedRoles.includes("front desk")
  ) {
    return "/patients";
  }
  return "/dashboard";
}
