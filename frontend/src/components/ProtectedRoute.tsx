import { Navigate } from "react-router-dom";
import { type ReactElement, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { isJwtExpired } from "../utils/session";
import { endSession } from "../services/sessionManager";

type ProtectedRouteProps = {
  children: ReactElement;
  requiredPermissions?: string[];
  anyPermissions?: string[];
  requiredRoles?: string[];
};

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  anyPermissions = [],
  requiredRoles = [],
}: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tokenExpired = isJwtExpired(token);

  useEffect(() => {
    if (tokenExpired) {
      endSession();
    }
  }, [tokenExpired]);

  if (!token || tokenExpired) {
    return <Navigate to={tokenExpired ? "/login?session=expired" : "/login"} replace />;
  }

  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];
  const hasRequiredPermissions = requiredPermissions.every((permission) => permissions.includes(permission));
  const hasAnyPermission =
    anyPermissions.length === 0 || anyPermissions.some((permission) => permissions.includes(permission));
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.some((role) => roles.includes(role));

  if (!hasRequiredPermissions || !hasAnyPermission || !hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
