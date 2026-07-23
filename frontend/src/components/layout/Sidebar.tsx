import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface Props {
  collapsed: boolean;
  toggle: () => void;
}

export function Sidebar({
  collapsed,
  toggle,
}: Props) {

  const location = useLocation();

  const user = useAuthStore((s) => s.user);

  const menus = [

    {
      title: "Dashboard",
      icon: "🏠",
      path: "/",
    },

    {
      title: "Patients",
      icon: "🩺",
      path: "/patients",
    },

    {
      title: "Appointments",
      icon: "📅",
      path: "/appointments",
    },

    {
      title: "Departments",
      icon: "🏥",
      path: "/departments",
    },

    {
      title: "Laboratory",
      icon: "🧪",
      path: "/laboratory",
    },

    {
      title: "Pharmacy",
      icon: "💊",
      path: "/pharmacy",
    },

    {
      title: "Inventory",
      icon: "📦",
      path: "/inventory",
    },

    {
      title: "Billing",
      icon: "💳",
      path: "/billing",
    },

    {
      title: "Reports",
      icon: "📈",
      path: "/reports",
    },

    {
      title: "Users",
      icon: "👥",
      path: "/admin/users",
    },

    {
      title: "Roles",
      icon: "🛡️",
      path: "/admin/roles",
    },

    {
      title: "Permissions",
      icon: "🔑",
      path: "/admin/permissions",
    },

  ];

  return (

    <aside
      className={`sidebar ${
        collapsed ? "collapsed" : ""
      }`}
    >

      <div className="sidebar-logo">

        <div className="logo-circle">
          C
        </div>

        {!collapsed && (

          <div>

            <h2>CeekayX HMS</h2>

            <span>
              Enterprise
            </span>

          </div>

        )}

      </div>

      <button
        className="collapse-btn"
        onClick={toggle}
      >
        {collapsed ? "➜" : "⬅"}
      </button>

      <nav>

        {menus.map((item) => (

          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? "sidebar-item active"
                : "sidebar-item"
            }
          >

            <span className="icon">
              {item.icon}
            </span>

            {!collapsed && (
              <span>{item.title}</span>
            )}

          </Link>

        ))}

      </nav>

      <div className="sidebar-footer">

        {!collapsed && (

          <>

            <strong>

              {user?.firstName} {user?.lastName}

            </strong>

            <small>

              {user?.roles?.join(", ")}

            </small>

          </>

        )}

      </div>

    </aside>

  );

}