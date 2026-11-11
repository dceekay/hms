import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiDownload,
  FiHelpCircle,
  FiLogOut,
  FiSettings,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiChevronDown,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { endSession } from "../../services/sessionManager";
import { getUserDisplayName } from "../../utils/userDisplay";
import { startRoleTour } from "../tour/RoleTour";
import type { BackendHealth } from "../../hooks/useBackendHealth";

interface UserMenuProps {
  status: BackendHealth;
  latencyMs?: number | null;
  pendingCount?: number | null;
  isBrowserOnline?: boolean;
  today?: string;
  currentTime?: string;
}

export default function UserMenu({
  status,
  latencyMs,
  pendingCount = 0,
  isBrowserOnline = true,
  today,
  currentTime,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const displayName = getUserDisplayName(user);
  const primaryRole = user?.roles?.[0] ?? "Care team";
  const initials = `${user?.firstName?.charAt(0) || "A"}${user?.lastName?.charAt(0) || ""}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    endSession();
    navigate("/login", { replace: true });
  };

  const handleSettings = () => {
    setOpen(false);
    navigate("/settings");
  };

  const handleTour = () => {
    setOpen(false);
    startRoleTour();
  };

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        className={`user-menu-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="User profile & system menu"
        type="button"
      >
        <div className="avatar">
          {initials}
          <span className={`avatar-status-dot ${status}`} title={`API: ${status}`} />
        </div>
        <div className="user-menu-trigger-text">
          <strong>{displayName}</strong>
          <small>{primaryRole}</small>
        </div>
        <FiChevronDown className={`user-menu-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="user-menu-dropdown animate-scale-in">
          {/* User Header */}
          <div className="user-menu-header">
            <div className="avatar avatar-lg">{initials}</div>
            <div className="user-menu-header-info">
              <strong>{displayName}</strong>
              <small>{user?.username ? `@${user.username}` : user?.email}</small>
              <span className="user-menu-role-badge">{primaryRole}</span>
            </div>
          </div>

          {/* System & Sync Info */}
          <div className="user-menu-system-info">
            <div className="user-menu-system-item">
              <span className={`system-status-indicator ${status}`}>
                {status === "online" ? <FiWifi /> : <FiWifiOff />}
              </span>
              <div>
                <span className="sys-label">Server Connection</span>
                <span className="sys-val">
                  {status === "online" ? "Connected" : status}
                </span>
              </div>
            </div>

            {today && currentTime && (
              <div className="user-menu-system-item">
                <span className="system-status-indicator time-indicator">
                  <FiClock />
                </span>
                <div>
                  <span className="sys-label">{today}</span>
                  <span className="sys-val">{currentTime}</span>
                </div>
              </div>
            )}

            {Boolean(pendingCount && pendingCount > 0) && (
              <div className="user-menu-system-item sync-item">
                <span className="system-status-indicator sync-indicator">
                  <FiRefreshCw className="spin-slow" />
                </span>
                <div>
                  <span className="sys-label">Saved Offline</span>
                  <span className="sys-val">
                    {pendingCount} item{pendingCount === 1 ? "" : "s"} waiting to send
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="user-menu-divider" />

          {/* Actions */}
          <div className="user-menu-actions">
            <button type="button" onClick={handleSettings} className="user-menu-item">
              <FiSettings />
              <span>Account Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("open-pwa-install"));
              }}
              className="user-menu-item"
            >
              <FiDownload />
              <span>Install App</span>
            </button>

            <button type="button" onClick={handleTour} className="user-menu-item">
              <FiHelpCircle />
              <span>Help Guide</span>
            </button>
          </div>

          <div className="user-menu-divider" />

          <div className="user-menu-footer">
            <button type="button" onClick={handleLogout} className="user-menu-logout-btn">
              <FiLogOut />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
