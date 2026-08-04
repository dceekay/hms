import { useNavigate } from "react-router-dom";
import {
  FiClock,
  FiLogOut,
  FiMoon,
  FiSearch,
  FiSun,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useThemeMode } from "../../hooks/useThemeMode";
import NotificationCenter from "./NotificationCenter";
import { endSession } from "../../services/sessionManager";
import { getUserDisplayName } from "../../utils/userDisplay";

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { status, latencyMs } = useBackendHealth();
  const { isDark, toggleTheme } = useThemeMode();

  const primaryRole = user?.roles?.[0] ?? "Care team";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleLogout = () => {
    endSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-kicker">{primaryRole}</p>
        <h2>
          Welcome, <span>{getUserDisplayName(user)}</span>
        </h2>

        <p>
          <FiClock />
          {today}
        </p>
      </div>

      <div className="topbar-right">
        <label className="topbar-search" aria-label="Search workspace">
          <FiSearch />
          <input type="text" placeholder="Search patients, doctors..." />
        </label>

        <div className={`backend-status ${status}`} title={`Backend is ${status}`}>
          {status === "online" ? <FiWifi /> : <FiWifiOff />}
          <span className="status-pulse" />
          <div>
            <strong>{status === "checking" ? "Checking" : status}</strong>
            <small>{latencyMs ? `${latencyMs} ms` : "API status"}</small>
          </div>
        </div>

        <button
          className="icon-btn theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <FiSun /> : <FiMoon />}
        </button>

        <NotificationCenter />

        <div className="profile">
          <div className="avatar">
            {user?.firstName?.charAt(0) || "A"}
            {user?.lastName?.charAt(0) || ""}
          </div>

          <div>
            <strong>
              {getUserDisplayName(user)}
            </strong>

            <small>{user?.roles?.join(", ") || "Care team"}</small>
          </div>
        </div>

        <button className="logout-btn" type="button" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
