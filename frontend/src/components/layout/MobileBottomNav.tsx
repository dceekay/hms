import { NavLink, useLocation } from "react-router-dom";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bell as FiBell,
  BedDouble as FaBed,
  CalendarDays as FiCalendar,
  ChartNoAxesColumn as FiGrid,
  ClipboardList as FiClipboard,
  CreditCard as FiCreditCard,
  FileText as FiFileText,
  FlaskConical as FaFlask,
  House as FiHome,
  LogIn as FiLogIn,
  NotebookPen as FaNotesMedical,
  Package as FiPackage,
  Pill as FaCapsules,
  Settings as FiSettings,
  ShieldCheck as FiShield,
  Stethoscope as FaUserNurse,
  UserRound,
  UsersRound as FiUsers,
  Menu as FiMenuIcon,
  X as FiX,
} from "lucide-react";

const FaUserInjured = UserRound;
const FaUserMd = UserRound;
import { useAuthStore } from "../../store/authStore";
import { getRoleHomePath } from "../../utils/roleHome";

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

const doctorMobileItems: MobileNavItem[] = [
  { label: "Today", path: "/doctor", icon: <FaUserMd /> },
  { label: "Patients", path: "/doctor/patients", icon: <FaUserInjured /> },
  { label: "Results", path: "/doctor/results", icon: <FaFlask /> },
  { label: "Reminders", path: "/doctor/reminders", icon: <FiBell /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const nurseMobileItems: MobileNavItem[] = [
  { label: "Desk", path: "/nurse", icon: <FaUserNurse /> },
  { label: "Patients", path: "/nurse/patients", icon: <FaUserInjured /> },
  { label: "Ward", path: "/nurse/ward", icon: <FaBed /> },
  { label: "Meds", path: "/nurse/medications", icon: <FaCapsules /> },
  { label: "Orders", path: "/nurse/orders", icon: <FiFileText /> },
  { label: "Vitals", path: "/nurse/vitals", icon: <FiClipboard /> },
  { label: "Notes", path: "/nurse/notes", icon: <FaNotesMedical /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const labMobileItems: MobileNavItem[] = [
  { label: "Lab", path: "/laboratory", icon: <FaFlask /> },
  { label: "Panels", path: "/laboratory/templates", icon: <FiFileText /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const pharmacyMobileItems: MobileNavItem[] = [
  { label: "Pharmacy", path: "/pharmacy", icon: <FaCapsules /> },
  { label: "Store", path: "/inventory", icon: <FiPackage /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const receptionMobileItems: MobileNavItem[] = [
  { label: "Patients", path: "/patients", icon: <FaUserInjured /> },
  { label: "Register", path: "/register-patient", icon: <FiUsers /> },
  { label: "Appts", path: "/appointments", icon: <FiCalendar /> },
  { label: "Wards", path: "/setup/wards", icon: <FaBed /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const securityMobileItems: MobileNavItem[] = [
  { label: "Entry", path: "/security/entry", icon: <FiShield /> },
  { label: "Logs", path: "/security/logs", icon: <FiFileText /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

const billingMobileItems: MobileNavItem[] = [
  { label: "Billing", path: "/billing", icon: <FiCreditCard /> },
  { label: "Patients", path: "/patients", icon: <FaUserInjured /> },
  { label: "Me", path: "/settings", icon: <FiSettings /> },
];

interface MobileBottomNavProps {
  onOpenMenu?: () => void;
}

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps = {}) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const normalizedRoles = useMemo(() => roles.map((role) => role.toLowerCase()), [roles]);

  const isSuperAdmin = normalizedRoles.some((r) =>
    ["super admin", "administrator", "admin"].includes(r)
  );
  const isSecurityRole = !isSuperAdmin && normalizedRoles.includes("security");
  const isDoctorRole = normalizedRoles.includes("doctor");
  const isDoctorActive = isDoctorRole || location.pathname.startsWith("/doctor");
  const isNurseRole = !isSuperAdmin && !isDoctorRole && normalizedRoles.includes("nurse");
  const isLabRole = !isSuperAdmin && normalizedRoles.includes("laboratory");
  const isPharmacyRole =
    !isSuperAdmin &&
    (normalizedRoles.includes("pharmacist") || normalizedRoles.includes("pharmacy"));
  const isReceptionRole =
    !isSuperAdmin &&
    (normalizedRoles.includes("receptionist") ||
      normalizedRoles.includes("reception") ||
      normalizedRoles.includes("desk office") ||
      normalizedRoles.includes("desk"));
  const isBillingRole =
    !isSuperAdmin && (normalizedRoles.includes("cashier") || normalizedRoles.includes("billing"));

  const roleHomePath = useMemo(() => getRoleHomePath(roles), [roles]);

  const canAccess = (item: MobileNavItem) => {
    const hasRequiredRole =
      !item.requiredRoles?.length ||
      item.requiredRoles.some((role) => normalizedRoles.includes(role.toLowerCase()));
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

  const sourceItems = isSecurityRole
    ? securityMobileItems
    : isLabRole
      ? labMobileItems
      : isPharmacyRole
        ? pharmacyMobileItems
        : isDoctorActive
          ? doctorMobileItems
          : isNurseRole
            ? nurseMobileItems
            : isReceptionRole
              ? receptionMobileItems
              : isBillingRole
                ? billingMobileItems
                : mobileItems;
  const mappedItems = sourceItems
    .map((item) => item.label === "Home" ? { ...item, path: roleHomePath } : item)
    .filter(canAccess);
  const visibleItems = mappedItems.reduce<MobileNavItem[]>((items, item) => {
    const duplicateIndex = items.findIndex((candidate) => candidate.path === item.path);
    if (duplicateIndex === -1) return [...items, item];

    // Prefer the role-specific destination over a generic Home shortcut.
    if (items[duplicateIndex].label === "Home" && item.label !== "Home") {
      return items.map((candidate, index) => index === duplicateIndex ? item : candidate);
    }

    return items;
  }, []);
  const hasOverflow = visibleItems.length > 5;
  const primaryItems = hasOverflow ? visibleItems.slice(0, 4) : visibleItems;
  const overflowItems = hasOverflow ? visibleItems.slice(4) : [];
  const isItemActive = (path: string, navIsActive: boolean) => {
    const [itemPath, itemHash = ""] = path.split("#");
    if (isDoctorActive) {
      if (itemPath === "/doctor") {
        return ["/doctor", "/doctor/appointments"].includes(location.pathname);
      }
      if (itemPath === "/doctor/patients") {
        return [
          "/doctor/patients",
          "/doctor/note",
          "/doctor/notes",
          "/doctor/lab-order",
          "/doctor/prescription",
          "/doctor/admission",
          "/doctor/referral",
          "/doctor/history",
        ].includes(location.pathname);
      }
      if (itemPath === "/doctor/results") {
        return ["/doctor/results", "/doctor/lab"].includes(location.pathname);
      }
      if (itemPath === "/doctor/reminders") {
        return ["/doctor/reminders", "/doctor/schedule"].includes(location.pathname);
      }
    }
    return navIsActive && itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash);
  };
  const isPathCurrent = (path: string) => {
    const [itemPath, itemHash = ""] = path.split("#");
    return itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash);
  };
  const overflowIsActive = overflowItems.some((item) => isPathCurrent(item.path));

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div className="mobile-nav-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <section
            className="mobile-nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-nav-sheet-header">
              <div>
                <span>Navigation</span>
                <h2 id="mobile-nav-sheet-title">More destinations</h2>
              </div>
              <button
                type="button"
                className="mobile-nav-close-btn modal-close-btn"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more navigation"
                title="Close"
              >
                <FiX size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="mobile-nav-sheet-grid">
              {onOpenMenu && (
                <button
                  type="button"
                  className="mobile-nav-sheet-item mobile-nav-full-menu-btn"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenMenu();
                  }}
                  style={{
                    gridColumn: "1 / -1",
                    background: "rgba(14, 165, 233, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    fontWeight: 700,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <FiMenuIcon size={20} />
                  <span>Open Full Sidebar Menu</span>
                </button>
              )}
              {overflowItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isItemActive(item.path, isActive) ? "mobile-nav-sheet-item active" : "mobile-nav-sheet-item"
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile app navigation" data-tour-region="mobile-bottom-nav">
        {primaryItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isItemActive(item.path, isActive) ? "mobile-nav-item active" : "mobile-nav-item"
            }
            data-tour-mobile-path={item.path}
            data-tour-mobile-title={tourKey(item.label)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        {hasOverflow && (
          <button
            type="button"
            className={overflowIsActive ? "mobile-nav-item mobile-nav-more active" : "mobile-nav-item mobile-nav-more"}
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-controls="mobile-nav-sheet-title"
          >
            <FiGrid />
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  );
}

