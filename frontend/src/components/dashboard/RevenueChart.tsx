import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { month: "Jan", revenue: 22000 },
  { month: "Feb", revenue: 28000 },
  { month: "Mar", revenue: 26000 },
  { month: "Apr", revenue: 35000 },
  { month: "May", revenue: 42000 },
  { month: "Jun", revenue: 48000 },
];

export default function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <XAxis dataKey="month" stroke="#94a3b8" />
        <Tooltip />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3B82F6"
          fill="#2563eb55"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}