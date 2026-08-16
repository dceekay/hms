import { useNavigate } from "react-router-dom";
import {
  FiClock,
  FiHelpCircle,
  FiLogOut,
  FiMoon,
  FiSearch,
  FiSettings,
  FiSun,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useThemeMode } from "../../hooks/useThemeMode";
import NotificationCenter from "./NotificationCenter";
import { endSession } from "../../services/sessionManager";
import { getUserDisplayName } from "../../utils/userDisplay";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import { startRoleTour } from "../tour/RoleTour";

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { status, latencyMs } = useBackendHealth();
  const { pendingCount, isBrowserOnline } = useOfflineQueueCount();
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

        {pendingCount > 0 && (
          <div
            className={`backend-status sync-queue-status ${isBrowserOnline ? "online" : "offline"}`}
            title={`${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting to sync`}
          >
            <FiRefreshCw />
            <span className="status-pulse" />
            <div>
              <strong>{pendingCount} queued</strong>
              <small>{isBrowserOnline ? "Syncing soon" : "Offline"}</small>
            </div>
          </div>
        )}

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

        <button
          className="icon-btn tour-trigger-btn"
          type="button"
          onClick={startRoleTour}
          aria-label="Start guided tour"
          title="Start guided tour"
        >
          <FiHelpCircle />
          <span>Tour</span>
        </button>

        <button
          className="icon-btn"
          type="button"
          onClick={() => navigate("/settings")}
          aria-label="Open account settings"
          title="Account settings"
        >
          <FiSettings />
        </button>

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
