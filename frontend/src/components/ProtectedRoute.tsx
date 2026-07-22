import { Navigate } from "react-router-dom";
import { ReactElement } from "react";
import { useAuthStore } from "../store/authStore";

type ProtectedRouteProps = {
  children: ReactElement;
  requiredPermissions?: string[];
};

export function ProtectedRoute({ children, requiredPermissions = [] }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const permissions = user?.permissions ?? [];
  const canAccess = requiredPermissions.every((permission) => permissions.includes(permission));

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}
