import { FiBell, FiMoon, FiSearch, FiSun, FiWifi, FiWifiOff } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useThemeMode } from "../../hooks/useThemeMode";

export default function Topbar() {
  const user = useAuthStore((state) => state.user);
  const { status, latencyMs, isOnline } = useBackendHealth();
  const { isDark, toggleTheme } = useThemeMode();

  const initials = `${user?.firstName?.charAt(0) ?? "A"}${user?.lastName?.charAt(0) ?? ""}`;
  const roleLabel = user?.roles?.join(", ") || "Administrator";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-kicker">Hospital command center</p>
        <h2>
          Welcome back,
          <span> {user?.firstName || "Admin"}</span>
        </h2>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <FiSearch />
          <input type="text" placeholder="Search patients, staff, records..." />
        </div>

        <div className={`backend-status ${status}`} title="Backend API health">
          <span className="status-pulse" />
          {isOnline ? <FiWifi /> : <FiWifiOff />}
          <strong>{status === "checking" ? "Checking" : isOnline ? "Online" : "Offline"}</strong>
          {latencyMs !== null && <small>{latencyMs}ms</small>}
        </div>

        <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <FiSun /> : <FiMoon />}
        </button>

        <button className="icon-btn notification-action" type="button" aria-label="Notifications">
          <FiBell />
          <span />
        </button>

        <div className="profile">
          <div className="avatar">{initials}</div>

          <div>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>

            <small>{roleLabel}</small>
          </div>
        </div>
      </div>
    </header>
  );
}
