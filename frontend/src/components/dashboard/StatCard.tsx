import { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  change?: string;
  color?: string;
}

export default function StatCard({ title, value, icon, change, color = "#2563eb" }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div>
          <p>{title}</p>
          <h2>{value}</h2>
        </div>

        <div className="stat-icon" style={{ backgroundColor: color }}>
          {icon}
        </div>
      </div>

      {change && <div className="stat-change">{change} this month</div>}
    </div>
  );
}
