import { Navigate } from "react-router-dom";
import { ReactElement } from "react";
import { useAuthStore } from "../store/authStore";

type ProtectedRouteProps = {
  children: ReactElement;
  requiredPermissions?: string[];
  anyPermissions?: string[];
};

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  anyPermissions = [],
}: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const permissions = user?.permissions ?? [];
  const hasRequiredPermissions = requiredPermissions.every((permission) => permissions.includes(permission));
  const hasAnyPermission =
    anyPermissions.length === 0 || anyPermissions.some((permission) => permissions.includes(permission));

  if (!hasRequiredPermissions || !hasAnyPermission) {
    return <Navigate to="/" replace />;
  }

  return children;
}
