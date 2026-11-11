import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiLogOut,
  FiRefreshCw,
  FiWifiOff,
} from "react-icons/fi";
import { FaSun, FaMoon } from "react-icons/fa6";
import { useAuthStore } from "../../store/authStore";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useThemeMode } from "../../hooks/useThemeMode";
import NotificationCenter from "./NotificationCenter";
import UserMenu from "./UserMenu";
import { endSession } from "../../services/sessionManager";
import { getUserDisplayName } from "../../utils/userDisplay";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export default function Topbar({ onOpenSidebar: _onOpenSidebar }: TopbarProps = {}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { status, latencyMs } = useBackendHealth();
  const { pendingCount, isBrowserOnline } = useOfflineQueueCount();
  const { isDark, toggleTheme } = useThemeMode();
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  const primaryRole = user?.roles?.[0] ?? "Care team";
  const displayName = getUserDisplayName(user);
  const greetingName = user?.firstName?.trim() || displayName.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const handleLogout = () => {
    endSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar" data-tour-region="topbar">
      <div className="topbar-left">
        <div>
          <p className="topbar-kicker">{primaryRole}</p>
          <h2>
            Welcome, <span>{greetingName}</span>
          </h2>
        </div>
      </div>

      <div className="topbar-right">
        {/* Desktop-only System Status Group */}
        <div className="topbar-status-group desktop-only" aria-label="System status">
          <div className="topbar-time-card" data-tour-target="topbar-time">
            <FiCalendar />
            <span>{today}</span>
            <strong>
              <FiClock />
              {currentTime}
            </strong>
          </div>

          {status !== "online" && (
            <div className={`backend-status ${status}`} title={`Server connection: ${status}`}>
              <FiWifiOff />
              <span className="status-pulse" />
              <div>
                <strong>{status === "checking" ? "Connecting" : "Offline"}</strong>
                <small>Check network</small>
              </div>
            </div>
          )}

          {pendingCount > 0 && (
            <div
              className={`backend-status sync-queue-status ${isBrowserOnline ? "online" : "offline"}`}
              title={`${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting to sync`}
            >
              <FiRefreshCw />
              <span className="status-pulse" />
              <div>
                <strong>{pendingCount} waiting</strong>
                <small>{isBrowserOnline ? "Sending now" : "Saved offline"}</small>
              </div>
            </div>
          )}
        </div>

        {/* Action Group */}
        <div className="topbar-action-group" aria-label="Workspace actions">
          <button
            className="icon-btn theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            data-tour-target="theme-toggle"
          >
            {isDark ? <FaSun size={28} /> : <FaMoon size={28} />}
          </button>

          <NotificationCenter />
        </div>

        {/* User Menu / Account Group */}
        <div className="topbar-account-group" aria-label="Account">
          <UserMenu
            status={status}
            latencyMs={latencyMs}
            pendingCount={pendingCount}
            isBrowserOnline={isBrowserOnline}
            today={today}
            currentTime={currentTime}
          />

          <button
            className="logout-btn desktop-only"
            type="button"
            onClick={handleLogout}
            data-tour-target="logout-button"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

