import { ReactNode } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import "../../styles/workspace-primitives.css";

export interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  subtitle?: string;
  actions?: ReactNode;
  showConnectivity?: boolean;
  banner?: ReactNode;
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  subtitle,
  actions,
  showConnectivity = true,
  banner,
}: WorkspaceHeaderProps) {
  const { status, latencyMs, recheck } = useBackendHealth();
  const { pendingCount, isBrowserOnline } = useOfflineQueueCount();

  const connLabel = (() => {
    if (status === "online") {
      return {
        tone: "online",
        text: "API Online",
        detail: latencyMs ? `${latencyMs}ms` : "Live",
        icon: <Wifi size={13} />,
      };
    }
    if (status === "slow") {
      return {
        tone: "slow",
        text: "Slow Connection",
        detail: latencyMs ? `${latencyMs}ms` : "Cached",
        icon: <Wifi size={13} />,
      };
    }
    if (status === "server-offline") {
      return {
        tone: "offline",
        text: "Server Unreachable",
        detail: "Offline Mode",
        icon: <WifiOff size={13} />,
      };
    }
    if (status === "offline" || !isBrowserOnline) {
      return {
        tone: "offline",
        text: "Offline",
        detail: pendingCount > 0 ? `${pendingCount} queued` : "Local Cache",
        icon: <WifiOff size={13} />,
      };
    }
    return {
      tone: "checking",
      text: "Checking API",
      detail: "Syncing...",
      icon: <RefreshCw size={13} className="spin" />,
    };
  })();

  return (
    <div className="ws-header-wrapper">
      <header className="ws-header">
        <div className="ws-header-copy">
          <div className="ws-header-meta-row">
            {eyebrow && <span className="ws-eyebrow">{eyebrow}</span>}
            {showConnectivity && (
              <button
                type="button"
                className={`ws-conn-pill ${connLabel.tone}`}
                onClick={() => void recheck()}
                title="Click to test real-time hospital server connection"
              >
                <span className="ws-conn-dot" />
                {connLabel.icon}
                <strong>{connLabel.text}</strong>
                <span className="ws-conn-detail">• {connLabel.detail}</span>
              </button>
            )}
          </div>
          <h1 className="ws-title">{title}</h1>
          {(description || subtitle) && <p className="ws-description">{description || subtitle}</p>}
        </div>

        {actions && <div className="ws-header-actions">{actions}</div>}
      </header>
      {banner && <div className="ws-header-banner">{banner}</div>}
    </div>
  );
}

export type WorkspaceTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "teal"
  | "neutral"
  | "amber"
  | "blue"
  | "rose"
  | "slate";

export interface WorkspaceKpiItem {
  id?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  badge?: string;
  badgeTone?: WorkspaceTone | string;
  tone?: WorkspaceTone | string;
  icon?: ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}

export function WorkspaceKpiGrid({
  items,
  columns = 4,
}: {
  items: WorkspaceKpiItem[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <section
      className={`ws-kpi-grid cols-${columns}`}
      aria-label="Key performance metrics"
    >
      {items.map((item, idx) => {
        const Tag = item.onClick ? "button" : "article";
        const kpiSubtitle = item.subtitle || item.subtext;
        const activeTone = item.badgeTone || item.tone;
        return (
          <Tag
            key={item.id ?? `${item.label}-${idx}`}
            type={item.onClick ? "button" : undefined}
            className={`ws-kpi-card ${item.onClick ? "is-clickable clickable" : ""} ${
              item.active ? "active" : ""
            } ${activeTone ? `tone-${activeTone}` : ""}`}
            onClick={item.onClick}
          >
            <div className="ws-kpi-top">
              <span className="ws-kpi-label">{item.label}</span>
              {item.icon && (
                <span
                  className={`ws-kpi-icon ${activeTone ? `tone-${activeTone}` : ""}`}
                  style={item.color ? { background: item.color } : undefined}
                >
                  {item.icon}
                </span>
              )}
            </div>

            <div className="ws-kpi-value">{item.value}</div>

            {(kpiSubtitle || item.badge) && (
              <div className="ws-kpi-footer">
                {item.badge && (
                  <span className={`ws-kpi-badge ${activeTone ? `tone-${activeTone}` : "neutral"}`}>
                    {item.badge}
                  </span>
                )}
                {kpiSubtitle && (
                  <span className="ws-kpi-subtext ws-kpi-subtitle">{kpiSubtitle}</span>
                )}
              </div>
            )}
          </Tag>
        );
      })}
    </section>
  );
}

export interface WorkspaceSectionProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function WorkspaceSection({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  children,
  className = "",
  id,
}: WorkspaceSectionProps) {
  return (
    <section id={id} className={`ws-section ${className}`.trim()}>
      <div className="ws-section-head">
        <div className="ws-section-title-group">
          {icon && <span className="ws-section-icon">{icon}</span>}
          <div>
            {eyebrow && <span className="ws-section-eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="ws-section-actions">{actions}</div>}
      </div>
      <div className="ws-section-body">{children}</div>
    </section>
  );
}

export interface WorkspaceEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function WorkspaceEmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: WorkspaceEmptyStateProps) {
  return (
    <div className={`ws-empty-state ${compact ? "compact" : ""}`}>
      {icon && <div className="ws-empty-icon">{icon}</div>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="ws-empty-action">{action}</div>}
    </div>
  );
}

