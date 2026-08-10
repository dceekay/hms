import { NavLink, useLocation } from "react-router-dom";
import { type ReactNode, useMemo } from "react";
import {
  FiBell,
  FiCalendar,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiLogIn,
  FiPackage,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { FaCapsules, FaFlask, FaUserInjured, FaUserMd } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";

type MobileNavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  anyPermissions?: string[];
};

const mobileItems: MobileNavItem[] = [
  { label: "Home", path: "/", icon: <FiHome /> },
  { label: "Patients", path: "/patients", icon: <FaUserInjured />, requiredPermissions: ["patients.read"] },
  {
    label: "Register",
    path: "/register-patient",
    icon: <FiUsers />,
    anyPermissions: ["patients.create", "patients.investigation.create"],
  },
  { label: "Billing", path: "/billing", icon: <FiCreditCard />, requiredPermissions: ["billing.read"] },
  { label: "Doctor", path: "/doctor", icon: <FaUserMd />, requiredRoles: ["Doctor"] },
  { label: "Lab", path: "/laboratory", icon: <FaFlask />, requiredPermissions: ["laboratory.read"] },
  { label: "Pharmacy", path: "/pharmacy", icon: <FaCapsules />, requiredPermissions: ["pharmacy.read"] },
  { label: "Store", path: "/inventory", icon: <FiPackage />, requiredPermissions: ["inventory.read"] },
  { label: "Admin", path: "/admin/users", icon: <FiShield />, requiredPermissions: ["users.read"] },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const securityMobileItems: MobileNavItem[] = [
  {
    label: "Entry",
    path: "/security/entry",
    icon: <FiLogIn />,
    requiredPermissions: ["security.entry.create"],
  },
  {
    label: "Logs",
    path: "/security/logs",
    icon: <FiFileText />,
    requiredPermissions: ["security.entry.read"],
  },
  {
    label: "Me",
    path: "/settings",
    icon: <FiSettings />,
  },
];

const doctorMobileItems: MobileNavItem[] = [
  { label: "Desk", path: "/doctor", icon: <FaUserMd /> },
  { label: "Queue", path: "/doctor#appointments", icon: <FiCalendar /> },
  { label: "Patient", path: "/doctor#patients", icon: <FaUserInjured /> },
  { label: "Lab", path: "/doctor#lab", icon: <FaFlask /> },
  { label: "Rx", path: "/doctor#prescription", icon: <FaCapsules /> },
  { label: "Notes", path: "/doctor#notes", icon: <FiClipboard /> },
  { label: "Remind", path: "/doctor#reminders", icon: <FiBell /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

export default function MobileBottomNav() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const securityOnly = roles.includes("Security") && roles.length === 1;
  const doctorOnly = roles.includes("Doctor") && roles.length === 1;

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

  const sourceItems = securityOnly ? securityMobileItems : doctorOnly ? doctorMobileItems : mobileItems;
  const visibleItems = sourceItems.filter(canAccess);
  const isItemActive = (path: string, navIsActive: boolean) => {
    const [itemPath, itemHash = ""] = path.split("#");
    return navIsActive && itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile app navigation">
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
    </nav>
  );
}
