import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDatabase,
  FiDroplet,
  FiHome,
  FiLayers,
  FiPackage,
  FiPieChart,
  FiPlusCircle,
  FiSettings,
  FiShield,
  FiTool,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaHospitalUser, FaUserInjured } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";

interface Props {
  collapsed: boolean;
  toggle: () => void;
}

type MenuItem = {
  title: string;
  icon: ReactNode;
  path?: string;
  children?: Array<{
    title: string;
    path: string;
    icon: ReactNode;
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
      { title: "Patient List", path: "/patients", icon: <FiUsers /> },
      { title: "Register Patient", path: "/register-patient", icon: <FiPlusCircle /> },
    ],
  },
  {
    title: "Appointments",
    icon: <FiActivity />,
    path: "/appointments",
  },
  {
    title: "Clinical",
    icon: <FaHospitalUser />,
    children: [
      { title: "Laboratory", path: "/laboratory", icon: <FaFlask /> },
      { title: "Pharmacy", path: "/pharmacy", icon: <FaCapsules /> },
    ],
  },
  {
    title: "Operations",
    icon: <FiLayers />,
    children: [
      { title: "Inventory", path: "/inventory", icon: <FiPackage /> },
      { title: "Billing", path: "/billing", icon: <FiCreditCard /> },
      { title: "Reports", path: "/reports", icon: <FiPieChart /> },
    ],
  },
  {
    title: "Setup",
    icon: <FiSettings />,
    children: [
      { title: "Departments", path: "/departments", icon: <FiDatabase /> },
      { title: "Wards & Beds", path: "/setup/wards", icon: <FaBed /> },
      { title: "Services", path: "/setup/services", icon: <FiTool /> },
      { title: "Insurance", path: "/setup/insurance", icon: <FiDroplet /> },
    ],
  },
  {
    title: "Administration",
    icon: <FiShield />,
    children: [
      { title: "Users", path: "/admin/users", icon: <FiUsers /> },
      { title: "Roles", path: "/admin/roles", icon: <FiShield /> },
      { title: "Permissions", path: "/admin/permissions", icon: <FiTool /> },
    ],
  },
  {
    title: "API Tester",
    icon: <FiDatabase />,
    path: "/api-tester",
  },
];

export function Sidebar({ collapsed, toggle }: Props) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const initiallyOpen = useMemo(() => {
    const openGroups = new Set<string>();

    menus.forEach((menu) => {
      if (menu.children?.some((child) => location.pathname === child.path)) {
        openGroups.add(menu.title);
      }
    });

    return openGroups;
  }, [location.pathname]);

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
        <div className="logo-mark" aria-hidden="true">
          <span>CX</span>
        </div>

        {!collapsed && (
          <div>
            <h2>CeekayX HMS</h2>
            <span>Care Command</span>
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
        {menus.map((item) => {
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
