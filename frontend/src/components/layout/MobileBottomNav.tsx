import { NavLink, useLocation } from "react-router-dom";
import { type ReactNode, useMemo } from "react";
import {
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiLogIn,
  FiMenu,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import {
  FaBed,
  FaCapsules,
  FaFlask,
  FaHospitalUser,
  FaUserInjured,
  FaUserNurse,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";

interface MobileBottomNavProps {
  onOpenMenu?: () => void;
}

type MobileNavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const doctorOnly = roles.includes("Doctor") && roles.length === 1;
  const nurseOnly = roles.includes("Nurse") && roles.length === 1;
  const securityOnly = roles.includes("Security") && roles.length === 1;

  const items: MobileNavItem[] = useMemo(() => {
    if (doctorOnly) {
      return [
        { label: "Desk", path: "/doctor", icon: <FaHospitalUser /> },
        { label: "Queue", path: "/doctor/waiting", icon: <FiUsers /> },
        { label: "Patients", path: "/doctor/patients", icon: <FaUserInjured /> },
        { label: "Labs", path: "/doctor/results", icon: <FaFlask /> },
      ];
    }

    if (nurseOnly) {
      return [
        { label: "Desk", path: "/nurse", icon: <FaUserNurse /> },
        { label: "Patients", path: "/nurse/patients", icon: <FaUserInjured /> },
        { label: "Wards", path: "/nurse/ward", icon: <FaBed /> },
        { label: "Meds", path: "/nurse/medications", icon: <FaCapsules /> },
      ];
    }

    if (securityOnly) {
      return [
        { label: "Entry", path: "/security/entry", icon: <FiLogIn /> },
        { label: "Logs", path: "/security/logs", icon: <FiFileText /> },
        { label: "Account", path: "/settings", icon: <FiSettings /> },
      ];
    }

    return [
      { label: "Home", path: "/dashboard", icon: <FiHome /> },
      { label: "Patients", path: "/patients", icon: <FaUserInjured /> },
      { label: "Billing", path: "/billing", icon: <FiCreditCard /> },
      { label: "Appts", path: "/appointments", icon: <FiCalendar /> },
    ];
  }, [doctorOnly, nurseOnly, securityOnly]);

  const isItemActive = (path: string, navIsActive: boolean) => {
    const [itemPath, itemHash = ""] = path.split("#");
    if (navIsActive && itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash)) {
      return true;
    }
    if (
      itemPath !== "/" &&
      itemPath !== "/dashboard" &&
      location.pathname.startsWith(`${itemPath}/`)
    ) {
      return true;
    }
    return false;
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            isItemActive(item.path, isActive)
              ? "mobile-nav-item active"
              : "mobile-nav-item"
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Menu / Drawer Trigger */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenMenu}
        aria-label="Open full menu"
      >
        <FiMenu />
        <span>Menu</span>
      </button>
    </nav>
  );
}
