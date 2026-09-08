import { Navigate, useLocation } from "react-router-dom";
import { type ReactElement, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { isJwtExpired } from "../utils/session";
import { endSession } from "../services/sessionManager";
import AuthenticatedRouteBoundary from "./AuthenticatedRouteBoundary";
import { getRoleHomePath } from "../utils/roleHome";

type ProtectedRouteProps = {
  children: ReactElement;
  requiredPermissions?: string[];
  anyPermissions?: string[];
  requiredRoles?: string[];
  allowRoles?: string[];
};

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  anyPermissions = [],
  requiredRoles = [],
  allowRoles = [],
}: ProtectedRouteProps) {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!token) return;

    if (isJwtExpired(token) && !refreshToken) {
      endSession();
    }
  }, [token, refreshToken]);

  if (!token && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  if (isJwtExpired(token) && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  // If user has an explicitly allowed role (e.g. Receptionist on billing/inventory), grant access immediately
  const hasAllowRole =
    allowRoles.length > 0 &&
    allowRoles.some((role) => normalizedRoles.includes(role.toLowerCase()));

  if (hasAllowRole) {
    return (
      <AuthenticatedRouteBoundary homePath={getRoleHomePath(roles)} resetKey={location.pathname}>
        {children}
      </AuthenticatedRouteBoundary>
    );
  }

  // Super Admin has complete administrative and clinical oversight across all hospital modules
  const isSuperAdmin = normalizedRoles.includes("super admin");
  if (isSuperAdmin) {
    return (
      <AuthenticatedRouteBoundary homePath={getRoleHomePath(roles)} resetKey={location.pathname}>
        {children}
      </AuthenticatedRouteBoundary>
    );
  }

  const hasRequiredPermissions = requiredPermissions.every((permission) =>
    permissions.includes(permission)
  );
  const hasAnyPermission =
    anyPermissions.length === 0 ||
    anyPermissions.some((permission) => permissions.includes(permission));
  const hasRequiredRole =
    requiredRoles.length === 0 ||
    requiredRoles.some((role) => normalizedRoles.includes(role.toLowerCase()));

  if (!hasRequiredPermissions || !hasAnyPermission || !hasRequiredRole) {
    return (
      <Navigate
        to={getRoleHomePath(roles)}
        replace
        state={{ accessDenied: true, attemptedPath: location.pathname }}
      />
    );
  }

  return (
    <AuthenticatedRouteBoundary homePath={getRoleHomePath(roles)} resetKey={location.pathname}>
      {children}
    </AuthenticatedRouteBoundary>
  );
}
