import { type ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
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
  FiTool,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaHospitalUser, FaUserInjured } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import mdsLogo from "../../assets/logo.png";

interface Props {
  collapsed: boolean;
  toggle: () => void;
}

type MenuItem = {
  title: string;
  icon: ReactNode;
  path?: string;
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

const menus: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <FiHome />,
    path: "/",
  },
  {
    title: "Patients",
    icon: <FaUserInjured />,
    children: [
      { title: "Patient List", path: "/patients", icon: <FiUsers />, requiredPermissions: ["patients.read"] },
      {
        title: "Register Patient",
        path: "/register-patient",
        icon: <FiPlusCircle />,
        anyPermissions: ["patients.create", "patients.investigation.create"],
      },
    ],
  },
  {
    title: "Appointments",
    icon: <FiActivity />,
    path: "/appointments",
    requiredPermissions: ["appointments.read"],
  },
  {
    title: "Clinical",
    icon: <FaHospitalUser />,
    children: [
      { title: "Laboratory", path: "/laboratory", icon: <FaFlask />, requiredPermissions: ["laboratory.read"] },
      { title: "Pharmacy", path: "/pharmacy", icon: <FaCapsules />, requiredPermissions: ["pharmacy.read"] },
    ],
  },
  {
    title: "Operations",
    icon: <FiLayers />,
    children: [
      { title: "Security Entry", path: "/security/entry", icon: <FiUserCheck />, requiredPermissions: ["security.entry.create"] },
      { title: "All Entries", path: "/security/logs", icon: <FiFileText />, requiredPermissions: ["security.entry.read"] },
      { title: "SEMSAS", path: "/operations/semsas", icon: <FiTruck />, requiredPermissions: ["semsas.read"] },
      { title: "Inventory", path: "/inventory", icon: <FiPackage />, requiredPermissions: ["inventory.read"] },
      { title: "Billing", path: "/billing", icon: <FiCreditCard />, requiredPermissions: ["billing.read"] },
      { title: "Reports", path: "/reports", icon: <FiPieChart />, requiredPermissions: ["reports.read"] },
    ],
  },
  {
    title: "Setup",
    icon: <FiSettings />,
    children: [
      { title: "Departments", path: "/departments", icon: <FiDatabase />, requiredPermissions: ["departments.read"] },
      { title: "Wards & Beds", path: "/setup/wards", icon: <FaBed />, requiredPermissions: ["setup.read"] },
      { title: "Services", path: "/setup/services", icon: <FiTool />, requiredRoles: ["Super Admin"] },
      { title: "Insurance", path: "/setup/insurance", icon: <FiDroplet />, requiredRoles: ["Super Admin"] },
    ],
  },
  {
    title: "Administration",
    icon: <FiShield />,
    children: [
      { title: "Users", path: "/admin/users", icon: <FiUsers />, requiredPermissions: ["users.read"] },
      { title: "Doctors", path: "/admin/doctors", icon: <FiUserPlus />, requiredRoles: ["Super Admin"] },
      { title: "Roles", path: "/admin/roles", icon: <FiShield />, requiredPermissions: ["roles.read"] },
      { title: "Permissions", path: "/admin/permissions", icon: <FiTool />, requiredPermissions: ["permissions.read"] },
    ],
  },
  {
    title: "API Tester",
    icon: <FiDatabase />,
    path: "/api-tester",
    requiredRoles: ["Super Admin"],
  },
];

export function Sidebar({ collapsed, toggle }: Props) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const securityOnly = roles.includes("Security") && roles.length === 1;

  const canAccess = (item: MenuItem | NonNullable<MenuItem["children"]>[number]) => {
    const hasRequiredRole = !item.requiredRoles?.length || item.requiredRoles.some((role) => roles.includes(role));
    const hasRequiredPermissions =
      !item.requiredPermissions?.length || item.requiredPermissions.every((permission) => permissions.includes(permission));
    const hasAnyPermission =
      !item.anyPermissions?.length || item.anyPermissions.some((permission) => permissions.includes(permission));

    return hasRequiredRole && hasRequiredPermissions && hasAnyPermission;
  };

  const visibleMenus = useMemo(
    () => {
      const sourceMenus: MenuItem[] = securityOnly
        ? [
            {
              title: "Security",
              icon: <FiShield />,
              children: [
                {
                  title: "Security Entry",
                  path: "/security/entry",
                  icon: <FiUserCheck />,
                  requiredPermissions: ["security.entry.create"],
                },
                {
                  title: "All Entries",
                  path: "/security/logs",
                  icon: <FiFileText />,
                  requiredPermissions: ["security.entry.read"],
                },
              ],
            },
          ]
        : menus;

      return sourceMenus
        .map((menu) => ({
          ...menu,
          children: menu.children?.filter(canAccess),
        }))
        .filter((menu) => canAccess(menu) && (!menu.children || menu.children.length > 0));
    },
    [permissions, roles, securityOnly]
  );

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

  const isActive = (path?: string) => path === location.pathname;
  const isGroupActive = (item: MenuItem) =>
    item.children?.some((child) => child.path === location.pathname) ?? false;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo">
        <img className="logo-mark" src={mdsLogo} alt="MDS Hospital" />

        {!collapsed && (
          <div>
            <h2>MDS Hospital</h2>
            <span>Staff Portal</span>
          </div>
        )}
      </div>

      <button
        className="collapse-btn"
        onClick={toggle}
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                >
                  <span className="icon">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span>{item.title}</span>
                      <FiChevronDown className={`submenu-chevron ${groupOpen ? "open" : ""}`} />
                    </>
                  )}
                </button>

                {!collapsed && groupOpen && (
                  <div className="sidebar-submenu">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={isActive(child.path) ? "sidebar-subitem active" : "sidebar-subitem"}
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
              className={isActive(item.path) ? "sidebar-item active" : "sidebar-item"}
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <small>{user?.roles?.join(", ") || "Care team"}</small>
          </>
        )}
      </div>
    </aside>
  );
}
