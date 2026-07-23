import { motion } from "framer-motion";

interface Props {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  change,
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      className="stat-card"
    >
      <div className="stat-info">
        <span>{title}</span>

        <h2>{value}</h2>

        {change && (
          <small>{change}</small>
        )}
      </div>

      <div
        className="stat-icon"
        style={{
          background: color,
        }}
      >
        {icon}
      </div>
    </motion.div>
  );
}