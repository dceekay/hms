import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function NavBar() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <nav className="nav-bar">
      <div className="nav-brand">CeekayX HMS</div>
      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/patients">Patients</Link>
        <Link to="/register-patient">Register Patient</Link>
        <Link to="/api-tester">API Tester</Link>
      </div>
      <button type="button" className="button button-secondary" onClick={logout}>
        Logout
      </button>
    </nav>
  );
}
