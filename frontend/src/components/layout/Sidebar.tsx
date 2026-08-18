import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiDatabase,
  FiDroplet,
  FiFileText,
  FiHome,
  FiLayers,
  FiPackage,
  FiPieChart,
  FiPlusCircle,
  FiSettings,
  FiShield,
  FiShare2,
  FiTool,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaHospitalUser, FaNotesMedical, FaUserInjured, FaUserNurse } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import mdsLogo from "../../assets/optimized/logo.png";
import { getUserDisplayName } from "../../utils/userDisplay";

interface Props {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen?: boolean;
  closeMobile?: () => void;
}

type MenuItem = {
  title: string;
  icon: ReactNode;
  path?: string;
  category?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  anyPermissions?: string[];
  children?: Array<{
    title: string;
    path: string;
    icon: ReactNode;
    requiredRoles?: string[];
    requiredPermissions?: string[];
    anyPermissions?: string[];
  }>;
};

function tourKey(value?: string) {
  return (value || "menu")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const menus: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <FiHome />,
    path: "/dashboard",
  },
  {
    title: "Clinical Care",
    icon: <FaHospitalUser />,
    category: "CLINICAL",
    children: [
      { title: "Doctor Desk", path: "/doctor", icon: <FaHospitalUser />, requiredRoles: ["Doctor", "Super Admin"] },
      { title: "Nurse Desk", path: "/nurse", icon: <FaUserNurse />, requiredRoles: ["Nurse", "Administrator", "Super Admin"] },
      { title: "Appointments Queue", path: "/appointments", icon: <FiCalendar />, requiredPermissions: ["appointments.read"] },
      {
        title: "Wards & Bed Admissions",
        path: "/setup/wards",
        icon: <FaBed />,
        requiredRoles: ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"],
      },
      { title: "Pharmacy Dispensing", path: "/pharmacy", icon: <FaCapsules />, requiredPermissions: ["pharmacy.read"] },
      { title: "Laboratory Tests", path: "/laboratory", icon: <FaFlask />, requiredPermissions: ["laboratory.read"] },
      { title: "Lab Templates", path: "/laboratory/templates", icon: <FiFileText />, requiredPermissions: ["laboratory.read"] },
    ],
  },
  {
    title: "Front Desk & Patients",
    icon: <FaUserInjured />,
    category: "PATIENTS",
    children: [
      { title: "Patient Directory", path: "/patients", icon: <FiUsers />, requiredPermissions: ["patients.read"] },
      {
        title: "Register Patient",
        path: "/register-patient",
        icon: <FiPlusCircle />,
        anyPermissions: ["patients.create", "patients.investigation.create"],
      },
      { title: "Desk Claims", path: "/desk-office", icon: <FiFileText />, requiredPermissions: ["claims.read"] },
    ],
  },
  {
    title: "Operations & Finance",
    icon: <FiLayers />,
    category: "OPERATIONS",
    children: [
      { title: "Billing & Cashier", path: "/billing", icon: <FiCreditCard />, requiredPermissions: ["billing.read"] },
      { title: "Inventory & Stores", path: "/inventory", icon: <FiPackage />, requiredPermissions: ["inventory.read"] },
      { title: "Security Gate Entry", path: "/security/entry", icon: <FiUserCheck />, requiredPermissions: ["security.entry.create"] },
      { title: "Security Entry Logs", path: "/security/logs", icon: <FiFileText />, requiredPermissions: ["security.entry.read"] },
      { title: "SEMSAS Emergency", path: "/operations/semsas", icon: <FiTruck />, requiredPermissions: ["semsas.read"] },
      { title: "Reports & Analytics", path: "/reports", icon: <FiPieChart />, requiredPermissions: ["reports.read"] },
    ],
  },
  {
    title: "Administration & Setup",
    icon: <FiShield />,
    category: "ADMIN",
    children: [
      { title: "Staff & Users", path: "/admin/users", icon: <FiUsers />, requiredPermissions: ["users.read"] },
      { title: "Doctor Profiles", path: "/admin/doctors", icon: <FiUserPlus />, requiredRoles: ["Super Admin"] },
      { title: "Roles & RBAC", path: "/admin/roles", icon: <FiShield />, requiredPermissions: ["roles.read"] },
      { title: "Permissions", path: "/admin/permissions", icon: <FiTool />, requiredPermissions: ["permissions.read"] },
      { title: "Hospital Services", path: "/setup/services", icon: <FiTool />, requiredRoles: ["Super Admin"] },
      { title: "Insurance Plans", path: "/setup/insurance", icon: <FiDroplet />, requiredRoles: ["Super Admin"] },
      { title: "Departments", path: "/departments", icon: <FiDatabase />, requiredPermissions: ["departments.read"] },
      { title: "API Tester", path: "/api-tester", icon: <FiDatabase />, requiredRoles: ["Super Admin"] },
    ],
  },
  {
    title: "Account & Settings",
    icon: <FiSettings />,
    path: "/settings",
  },
];

export function Sidebar({ collapsed, toggle, mobileOpen, closeMobile }: Props) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const securityOnly = roles.includes("Security") && roles.length === 1;
  const doctorOnly = roles.includes("Doctor") && roles.length === 1;
  const nurseOnly = roles.includes("Nurse") && roles.length === 1;
  const deskOfficeOnly = roles.includes("Desk Office") && roles.length === 1;

  const canAccess = (item: MenuItem | NonNullable<MenuItem["children"]>[number]) => {
    const hasRequiredRole = !item.requiredRoles?.length || item.requiredRoles.some((role) => roles.includes(role));
    const hasRequiredPermissions =
      !item.requiredPermissions?.length || item.requiredPermissions.every((permission) => permissions.includes(permission));
    const hasAnyPermission =
      !item.anyPermissions?.length || item.anyPermissions.some((permission) => permissions.includes(permission));

    return hasRequiredRole && hasRequiredPermissions && hasAnyPermission;
  };

  const visibleMenus = useMemo(() => {
    const sourceMenus: MenuItem[] = securityOnly
      ? [
          {
            title: "Security Gate",
            icon: <FiShield />,
            children: [
              {
                title: "Gate Entry Log",
                path: "/security/entry",
                icon: <FiUserCheck />,
                requiredPermissions: ["security.entry.create"],
              },
              {
                title: "All Gate Logs",
                path: "/security/logs",
                icon: <FiFileText />,
                requiredPermissions: ["security.entry.read"],
              },
            ],
          },
          {
            title: "Account",
            path: "/settings",
            icon: <FiSettings />,
          },
        ]
      : doctorOnly
        ? [
            {
              title: "Doctor Desk",
              icon: <FaHospitalUser />,
              path: "/doctor",
            },
            {
              title: "Consultation Queue",
              icon: <FiCalendar />,
              path: "/doctor/appointments",
            },
            {
              title: "Patient Records",
              icon: <FaUserInjured />,
              path: "/doctor/patients",
            },
            {
              title: "Clinical Tools",
              icon: <FiClipboard />,
              children: [
                { title: "Clinical Notes", path: "/doctor/notes", icon: <FaNotesMedical /> },
                { title: "Lab Requests", path: "/doctor/lab", icon: <FaFlask /> },
                { title: "Prescriptions", path: "/doctor/prescription", icon: <FaCapsules /> },
                { title: "Ward Requests", path: "/doctor/admission", icon: <FaBed /> },
                { title: "Referrals", path: "/doctor/referral", icon: <FiShare2 /> },
              ],
            },
            {
              title: "Wards & Beds",
              icon: <FaBed />,
              path: "/setup/wards",
            },
            {
              title: "Reminders",
              icon: <FiBell />,
              path: "/doctor/reminders",
            },
            {
              title: "Account",
              icon: <FiSettings />,
              path: "/settings",
            },
          ]
        : nurseOnly
          ? [
              { title: "Nurse Desk", icon: <FaUserNurse />, path: "/nurse" },
              { title: "Patient Directory", icon: <FaUserInjured />, path: "/patients" },
              { title: "Ward Inpatients", icon: <FaBed />, path: "/setup/wards" },
              { title: "Medication Rounds", icon: <FaCapsules />, path: "/nurse/medications" },
              { title: "Doctor Orders", icon: <FiFileText />, path: "/nurse/orders" },
              { title: "Vitals Observation", icon: <FiActivity />, path: "/nurse/vitals" },
              { title: "Nursing Notes", icon: <FaNotesMedical />, path: "/nurse/notes" },
              { title: "Reminders", icon: <FiBell />, path: "/nurse/reminders" },
              { title: "Account", icon: <FiSettings />, path: "/settings" },
            ]
          : deskOfficeOnly
            ? [
                { title: "Desk Office Claims", icon: <FiFileText />, path: "/desk-office" },
                { title: "Account", icon: <FiSettings />, path: "/settings" },
              ]
          : menus;

    return sourceMenus
      .map((menu) => ({
        ...menu,
        children: menu.children?.filter(canAccess),
      }))
      .filter((menu) => canAccess(menu) && (!menu.children || menu.children.length > 0));
  }, [permissions, roles, securityOnly, doctorOnly, nurseOnly, deskOfficeOnly]);

  const initiallyOpen = useMemo(() => {
    const openGroups = new Set<string>();

    visibleMenus.forEach((menu) => {
      if (menu.children?.some((child) => location.pathname === child.path)) {
        openGroups.add(menu.title);
      }
    });

    return openGroups;
  }, [location.pathname, visibleMenus]);

  const [openGroups, setOpenGroups] = useState(initiallyOpen);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = new Set(current);
      initiallyOpen.forEach((item) => next.add(item));
      return next;
    });
  }, [initiallyOpen]);

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isMenuActive = (path?: string) => {
    if (!path) return false;
    const [itemPath, itemHash = ""] = path.split("#");
    return itemPath === location.pathname && (!itemHash || `#${itemHash}` === location.hash);
  };

  const isGroupActive = (item: MenuItem) =>
    item.children?.some((child) => isMenuActive(child.path)) ?? false;

  const handleLinkClick = () => {
    if (closeMobile) {
      closeMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        data-tour-region="desktop-sidebar"
      >
        <div className="sidebar-logo">
          <img className="logo-mark" src={mdsLogo} alt="MDS Hospital" />

          {(!collapsed || mobileOpen) && (
            <div>
              <h2>MDS Hospital</h2>
              <span>Staff Portal</span>
            </div>
          )}

          {mobileOpen && (
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={closeMobile}
              aria-label="Close sidebar"
            >
              <FiX />
            </button>
          )}
        </div>

        <button
          className="collapse-btn"
          onClick={toggle}
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-tour-target="sidebar-collapse"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>

        <nav>
          {visibleMenus.map((item) => {
            const groupOpen = openGroups.has(item.title);
            const activeGroup = isGroupActive(item);

            if (item.children) {
              return (
                <div key={item.title} className={`sidebar-group ${activeGroup ? "active" : ""}`}>
                  <button
                    className="sidebar-item sidebar-group-trigger"
                    type="button"
                    onClick={() => toggleGroup(item.title)}
                    data-tour-group={tourKey(item.title)}
                  >
                    <span className="icon">{item.icon}</span>
                    {(!collapsed || mobileOpen) && (
                      <>
                        <span className="menu-label">{item.title}</span>
                        <FiChevronDown className={`submenu-chevron ${groupOpen ? "open" : ""}`} />
                      </>
                    )}
                  </button>

                  {(!collapsed || mobileOpen) && groupOpen && (
                    <div className="sidebar-submenu">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={handleLinkClick}
                          className={isMenuActive(child.path) ? "sidebar-subitem active" : "sidebar-subitem"}
                          data-tour-menu-path={child.path}
                          data-tour-menu-title={tourKey(child.title)}
                        >
                          <span className="subitem-icon">{child.icon}</span>
                          <span>{child.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path ?? "/"}
                onClick={handleLinkClick}
                className={isMenuActive(item.path) ? "sidebar-item active" : "sidebar-item"}
                data-tour-menu-path={item.path ?? "/"}
                data-tour-menu-title={tourKey(item.title)}
              >
                <span className="icon">{item.icon}</span>
                {(!collapsed || mobileOpen) && <span className="menu-label">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {(!collapsed || mobileOpen) && (
            <>
              <strong>{getUserDisplayName(user)}</strong>
              <small>{user?.roles?.join(", ") || "Care team"}</small>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
