import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { day: "Mon", appointments: 20 },
  { day: "Tue", appointments: 35 },
  { day: "Wed", appointments: 28 },
  { day: "Thu", appointments: 48 },
  { day: "Fri", appointments: 39 },
  { day: "Sat", appointments: 18 },
];

export default function AppointmentChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="day" stroke="#94a3b8" />
        <Tooltip />

        <Bar
          dataKey="appointments"
          radius={[8, 8, 0, 0]}
          fill="#22c55e"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}