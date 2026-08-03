import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { endSession } from "../services/sessionManager";

export function NavBar() {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const hasPermission = (permission: string) => permissions.includes(permission);
  const handleLogout = () => {
    endSession();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="nav-bar">
      <div className="nav-brand">CeekayX HMS</div>
      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        {hasPermission("patients.read") && <Link to="/patients">Patients</Link>}
        {hasPermission("patients.create") && <Link to="/register-patient">Register Patient</Link>}
        {hasPermission("users.read") && <Link to="/admin/users">Users</Link>}
        {hasPermission("roles.read") && <Link to="/admin/roles">Roles</Link>}
        {hasPermission("permissions.read") && <Link to="/admin/permissions">Permissions</Link>}
        <Link to="/api-tester">API Tester</Link>
      </div>
      <button type="button" className="button button-secondary" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}
