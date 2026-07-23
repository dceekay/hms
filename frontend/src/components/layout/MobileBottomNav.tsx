import { NavLink } from "react-router-dom";
import { FiDatabase, FiHome, FiShield, FiUsers } from "react-icons/fi";
import { FaUserInjured } from "react-icons/fa";

const mobileItems = [
  { label: "Home", path: "/", icon: <FiHome /> },
  { label: "Patients", path: "/patients", icon: <FaUserInjured /> },
  { label: "Register", path: "/register-patient", icon: <FiUsers /> },
  { label: "API", path: "/api-tester", icon: <FiDatabase /> },
  { label: "Admin", path: "/admin/users", icon: <FiShield /> },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile app navigation">
      {mobileItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => (isActive ? "mobile-nav-item active" : "mobile-nav-item")}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
