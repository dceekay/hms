import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  CalendarPlus,
  Pill,
  FlaskConical,
  Receipt,
  FileText,
} from "lucide-react";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Patient",
      icon: <UserPlus size={20} />,
      path: "/register-patient",
    },
    {
      title: "Appointment",
      icon: <CalendarPlus size={20} />,
      path: "/appointments",
    },
    {
      title: "Pharmacy",
      icon: <Pill size={20} />,
      path: "/pharmacy",
    },
    {
      title: "Laboratory",
      icon: <FlaskConical size={20} />,
      path: "/laboratory",
    },
    {
      title: "Billing",
      icon: <Receipt size={20} />,
      path: "/billing",
    },
    {
      title: "Reports",
      icon: <FileText size={20} />,
      path: "/reports",
    },
  ];

  return (
    <div className="quick-grid">
      {actions.map((action) => (
        <button
          key={action.title}
          onClick={() => navigate(action.path)}
        >
          {action.icon}

          <span>{action.title}</span>
        </button>
      ))}
    </div>
  );
}