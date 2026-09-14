import { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  change?: string;
  color?: string;
}

export default function StatCard({ title, value, icon, change, color = "#2563eb" }: Props) {
  const renderChangeText = () => {
    if (!change) return null;
    return change.trim();
  };

  const changeText = renderChangeText();

  return (
    <div className="stat-card" title={`${title}: ${value}`}>
      <div className="stat-top">
        <div className="stat-info">
          <p title={title}>{title}</p>
          <h2 title={value}>{value}</h2>
        </div>

        <div className="stat-icon" style={{ backgroundColor: color }} aria-hidden="true">
          {icon}
        </div>
      </div>

      {changeText && (
        <div className="stat-change" title={changeText}>
          {changeText}
        </div>
      )}
    </div>
  );
}
