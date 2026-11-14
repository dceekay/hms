import { KeyboardEvent, ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  change?: string;
  color?: string;
  onClick?: () => void;
  actionLabel?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  color = "#2563eb",
  onClick,
  actionLabel = "Open →",
}: Props) {
  const changeText = change ? change.trim() : null;
  const isClickable = Boolean(onClick);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`stat-card${isClickable ? " clickable" : ""}`}
      title={`${title}: ${value}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="stat-top">
        <div className="stat-info">
          <p title={title}>{title}</p>
          <h2 title={value}>{value}</h2>
        </div>

        <div className="stat-icon" style={{ backgroundColor: color }} aria-hidden="true">
          {icon}
        </div>
      </div>

      {(changeText || isClickable) && (
        <div className="stat-footer">
          {changeText ? (
            <div className="stat-change" title={changeText}>
              {changeText}
            </div>
          ) : (
            <span />
          )}
          {isClickable && <span className="stat-open-cue">{actionLabel}</span>}
        </div>
      )}
    </div>
  );
}
