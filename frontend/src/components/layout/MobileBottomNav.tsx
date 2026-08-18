import { NavLink, useLocation } from "react-router-dom";
import { type ReactNode, useMemo } from "react";
import {
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiLogIn,
  FiMenu,
  FiPlusCircle,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaUserInjured, FaUserMd, FaUserNurse } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";

type MobileNavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  anyPermissions?: string[];
};

function tourKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const mobileItems: MobileNavItem[] = [
  { label: "Home", path: "/dashboard", icon: <FiHome /> },
  { label: "Patients", path: "/patients", icon: <FaUserInjured />, requiredPermissions: ["patients.read"] },
  {
    label: "Register",
    path: "/register-patient",
    icon: <FiPlusCircle />,
    anyPermissions: ["patients.create", "patients.investigation.create"],
  },
  { label: "Queue", path: "/appointments", icon: <FiCalendar />, requiredPermissions: ["appointments.read"] },
  { label: "Billing", path: "/billing", icon: <FiCreditCard />, requiredPermissions: ["billing.read"] },
];

const securityMobileItems: MobileNavItem[] = [
  {
    label: "Gate Entry",
    path: "/security/entry",
    icon: <FiLogIn />,
    requiredPermissions: ["security.entry.create"],
  },
  {
    label: "Gate Logs",
    path: "/security/logs",
    icon: <FiFileText />,
    requiredPermissions: ["security.entry.read"],
  },
  {
    label: "Account",
    path: "/settings",
    icon: <FiSettings />,
  },
];

const doctorMobileItems: MobileNavItem[] = [
  { label: "Doctor Desk", path: "/doctor", icon: <FaUserMd /> },
  { label: "Queue", path: "/doctor/appointments", icon: <FiCalendar /> },
  { label: "Patients", path: "/doctor/patients", icon: <FaUserInjured /> },
  { label: "Wards", path: "/setup/wards", icon: <FaBed /> },
];

const nurseMobileItems: MobileNavItem[] = [
  { label: "Nurse Desk", path: "/nurse", icon: <FaUserNurse /> },
  { label: "Patients", path: "/patients", icon: <FaUserInjured /> },
  { label: "Wards", path: "/setup/wards", icon: <FaBed /> },
  { label: "Meds", path: "/nurse/medications", icon: <FaCapsules /> },
];

const deskOfficeMobileItems: MobileNavItem[] = [
  { label: "Claims", path: "/desk-office", icon: <FiFileText />, requiredPermissions: ["claims.read"] },
  { label: "Account", path: "/settings", icon: <FiSettings /> },
];

interface MobileBottomNavProps {
  onOpenMenu?: () => void;
}

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const securityOnly = roles.includes("Security") && roles.length === 1;
  const doctorOnly = roles.includes("Doctor") && roles.length === 1;
  const nurseOnly = roles.includes("Nurse") && roles.length === 1;
  const deskOfficeOnly = roles.includes("Desk Office") && roles.length === 1;

  const canAccess = (item: MobileNavItem) => {
    const hasRequiredRole =
      !item.requiredRoles?.length ||
      item.requiredRoles.some((role) => roles.includes(role));
    const hasRequiredPermissions =
      !item.requiredPermissions?.length ||
      item.requiredPermissions.every((permission) =>
        permissions.includes(permission)
      );
    const hasAnyPermission =
      !item.anyPermissions?.length ||
      item.anyPermissions.some((permission) => permissions.includes(permission));

    return hasRequiredRole && hasRequiredPermissions && hasAnyPermission;
  };

  const sourceItems = securityOnly
    ? securityMobileItems
    : doctorOnly
      ? doctorMobileItems
      : nurseOnly
        ? nurseMobileItems
        : deskOfficeOnly
          ? deskOfficeMobileItems
        : mobileItems;
  const visibleItems = sourceItems.filter(canAccess).slice(0, 4);
  const isItemActive = (path: string, navIsActive: boolean) => {
    const [itemPath, itemHash = ""] = path.split("#");
    return navIsActive && itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile app navigation" data-tour-region="mobile-bottom-nav">
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            isItemActive(item.path, isActive) ? "mobile-nav-item active" : "mobile-nav-item"
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}

      {onOpenMenu && (
        <button
          type="button"
          className="mobile-nav-item mobile-menu-btn"
          onClick={onOpenMenu}
          aria-label="Open full menu"
        >
          <FiMenu />
          <span>Menu</span>
        </button>
      )}
    </nav>
  );
}
