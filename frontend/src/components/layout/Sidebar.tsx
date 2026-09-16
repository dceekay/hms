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
  FiDownload,
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
import {
  FaBed,
  FaCapsules,
  FaFlask,
  FaHospitalUser,
  FaNotesMedical,
  FaUserInjured,
  FaUserNurse,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import mdsLogo from "../../assets/optimized/logo-sm.webp";
import { getUserDisplayName } from "../../utils/userDisplay";
import { getRoleHomePath } from "../../utils/roleHome";
import { getCachedDoctorWorkspace } from "../../services/clinicalService";
import { getCachedNurseWorkspace } from "../../services/nursingService";
import { HMS_DATA_MUTATED_EVENT } from "../../utils/appEvents";
import "../../styles/sidebar.css";

interface Props {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

type MenuItem = {
  title: string;
  icon: ReactNode;
  path?: string;
  badge?: string | number | null;
  badgeClass?: string;
  requiredRoles?: string[];
  allowRoles?: string[];
  requiredPermissions?: string[];
  anyPermissions?: string[];
  children?: Array<{
    title: string;
    path: string;
    icon: ReactNode;
    badge?: string | number | null;
    badgeClass?: string;
    requiredRoles?: string[];
    allowRoles?: string[];
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

export function Sidebar({ collapsed, toggle, mobileOpen = false, onCloseMobile }: Props) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const [docCache, setDocCache] = useState(getCachedDoctorWorkspace);
  const [nurseCache, setNurseCache] = useState(getCachedNurseWorkspace);

  useEffect(() => {
    const handleMutated = () => {
      setDocCache(getCachedDoctorWorkspace());
      setNurseCache(getCachedNurseWorkspace());
    };

    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutated);
    return () => window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutated);
  }, []);

  const waitingCount =
    docCache?.summary?.assignedAppointments ?? docCache?.assignedAppointments?.length ?? 0;
  const readyLabsCount =
    docCache?.summary?.completedLabResults ?? docCache?.completedLabRequests?.length ?? 0;
  const nurseWaitingCount = nurseCache?.summary?.pendingVitals ?? 0;
  const pendingMedsCount = nurseCache?.summary?.dueMedication ?? 0;

  const normalizedRoles = useMemo(() => roles.map((r) => r.toLowerCase()), [roles]);
  const hasRole = (role: string) => normalizedRoles.includes(role.toLowerCase());

  const isSuperAdmin = normalizedRoles.some((r) =>
    ["super admin", "administrator", "admin"].includes(r)
  );

  const securityOnly = !isSuperAdmin && hasRole("security");
  const doctorOnly = !isSuperAdmin && hasRole("doctor");
  const nurseOnly = !isSuperAdmin && !doctorOnly && hasRole("nurse");
  const laboratoryOnly = !isSuperAdmin && hasRole("laboratory");
  const pharmacyOnly = !isSuperAdmin && (hasRole("pharmacist") || hasRole("pharmacy"));
  const receptionOnly = !isSuperAdmin && (hasRole("receptionist") || hasRole("reception"));
  const deskOfficeOnly = !isSuperAdmin && (hasRole("desk office") || hasRole("desk"));
  const billingOnly = !isSuperAdmin && (hasRole("cashier") || hasRole("billing"));

  const roleHomePath = useMemo(() => getRoleHomePath(roles), [roles]);

  const menus: MenuItem[] = useMemo(
    () => [
      {
        title: "Dashboard",
        icon: <FiHome />,
        path: "/dashboard",
      },
      {
        title: "Patients",
        icon: <FaUserInjured />,
        children: [
          {
            title: "Patient Directory",
            path: "/patients",
            icon: <FiUsers />,
            requiredPermissions: ["patients.read"],
          },
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
          {
            title: "Doctor Desk",
            path: "/doctor",
            icon: <FaHospitalUser />,
            allowRoles: ["Doctor", "Super Admin", "Administrator"],
            badge: waitingCount > 0 ? waitingCount : null,
            badgeClass: "waiting",
          },
          {
            title: "Nurse Desk",
            path: "/nurse",
            icon: <FaUserNurse />,
            allowRoles: ["Nurse", "Super Admin", "Administrator"],
            badge: nurseWaitingCount > 0 ? nurseWaitingCount : null,
            badgeClass: "waiting",
          },
          {
            title: "Laboratory",
            path: "/laboratory",
            icon: <FaFlask />,
            requiredPermissions: ["laboratory.read"],
            badge: readyLabsCount > 0 ? readyLabsCount : null,
            badgeClass: "labs",
          },
          {
            title: "Lab Templates",
            path: "/laboratory/templates",
            icon: <FiFileText />,
            requiredPermissions: ["laboratory.read"],
          },
          {
            title: "Pharmacy",
            path: "/pharmacy",
            icon: <FaCapsules />,
            requiredPermissions: ["pharmacy.read"],
          },
        ],
      },
      {
        title: "Operations",
        icon: <FiLayers />,
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
          {
            title: "SEMSAS",
            path: "/operations/semsas",
            icon: <FiTruck />,
            requiredPermissions: ["semsas.read"],
          },
          {
            title: "Inventory",
            path: "/inventory",
            icon: <FiPackage />,
            requiredPermissions: ["inventory.read"],
          },
          {
            title: "Billing & Cashier",
            path: "/billing",
            icon: <FiCreditCard />,
            requiredPermissions: ["billing.read"],
          },
          {
            title: "Desk Office",
            path: "/desk-office",
            icon: <FiFileText />,
            requiredPermissions: ["claims.read"],
          },
          {
            title: "Reports",
            path: "/reports",
            icon: <FiPieChart />,
            requiredPermissions: ["reports.read"],
          },
        ],
      },
      {
        title: "Setup",
        icon: <FiSettings />,
        children: [
          {
            title: "Departments",
            path: "/departments",
            icon: <FiDatabase />,
            requiredPermissions: ["departments.read"],
          },
          {
            title: "Wards & Beds",
            path: "/setup/wards",
            icon: <FaBed />,
            requiredRoles: ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"],
          },
          {
            title: "Services",
            path: "/setup/services",
            icon: <FiTool />,
            requiredRoles: ["Super Admin"],
          },
          {
            title: "Insurance",
            path: "/setup/insurance",
            icon: <FiDroplet />,
            requiredRoles: ["Super Admin"],
          },
        ],
      },
      {
        title: "Administration",
        icon: <FiShield />,
        children: [
          {
            title: "Users",
            path: "/admin/users",
            icon: <FiUsers />,
            requiredPermissions: ["users.read"],
          },
          {
            title: "Doctors",
            path: "/admin/doctors",
            icon: <FiUserPlus />,
            requiredRoles: ["Super Admin"],
          },
          {
            title: "Roles",
            path: "/admin/roles",
            icon: <FiShield />,
            requiredPermissions: ["roles.read"],
          },
          {
            title: "Permissions",
            path: "/admin/permissions",
            icon: <FiTool />,
            requiredPermissions: ["permissions.read"],
          },
        ],
      },
      {
        title: "API Tester",
        icon: <FiDatabase />,
        path: "/api-tester",
        requiredRoles: ["Super Admin"],
      },
      {
        title: "Account",
        icon: <FiSettings />,
        path: "/settings",
      },
    ],
    [waitingCount, readyLabsCount, nurseWaitingCount]
  );

  const canAccess = (item: MenuItem | NonNullable<MenuItem["children"]>[number]) => {
    if (item.allowRoles?.length) {
      if (item.allowRoles.some((role) => hasRole(role))) {
        return true;
      }
    }

    const hasRequiredRole =
      !item.requiredRoles?.length || item.requiredRoles.some((role) => hasRole(role));
    const hasRequiredPermissions =
      !item.requiredPermissions?.length ||
      item.requiredPermissions.every((permission) => permissions.includes(permission));
    const hasAnyPermission =
      !item.anyPermissions?.length ||
      item.anyPermissions.some((permission) => permissions.includes(permission));

    return hasRequiredRole && hasRequiredPermissions && hasAnyPermission;
  };

  const visibleMenus = useMemo(() => {
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
              {
                title: "Account",
                path: "/settings",
                icon: <FiSettings />,
              },
            ],
          },
        ]
      : doctorOnly
        ? [
            {
              title: "Doctor Desk",
              icon: <FaHospitalUser />,
              path: "/doctor",
              badge: waitingCount > 0 ? waitingCount : null,
              badgeClass: "waiting",
            },
            {
              title: "Appointments",
              icon: <FiCalendar />,
              path: "/doctor/appointments",
            },
            {
              title: "Patients",
              icon: <FaUserInjured />,
              path: "/doctor/patients",
            },
            {
              title: "Care Tools",
              icon: <FiClipboard />,
              children: [
                { title: "Clinical Notes", path: "/doctor/notes", icon: <FaNotesMedical /> },
                {
                  title: "Lab Requests",
                  path: "/doctor/lab",
                  icon: <FaFlask />,
                  badge: readyLabsCount > 0 ? readyLabsCount : null,
                  badgeClass: "labs",
                },
                { title: "Prescriptions", path: "/doctor/prescription", icon: <FaCapsules /> },
                { title: "Ward Requests", path: "/doctor/admission", icon: <FaBed /> },
                { title: "Referrals", path: "/doctor/referral", icon: <FiShare2 /> },
              ],
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
              {
                title: "Nurse Desk",
                icon: <FaUserNurse />,
                path: "/nurse",
                badge: nurseWaitingCount > 0 ? nurseWaitingCount : null,
                badgeClass: "waiting",
              },
              { title: "Patients", icon: <FaUserInjured />, path: "/nurse/patients" },
              { title: "Ward Inpatients", icon: <FaBed />, path: "/nurse/ward" },
              {
                title: "Medication Rounds",
                icon: <FaCapsules />,
                path: "/nurse/medications",
                badge: pendingMedsCount > 0 ? pendingMedsCount : null,
                badgeClass: "urgent",
              },
              { title: "Doctor Orders", icon: <FiFileText />, path: "/nurse/orders" },
              { title: "Vitals & Triage", icon: <FiActivity />, path: "/nurse/vitals" },
              { title: "Nursing Notes", icon: <FaNotesMedical />, path: "/nurse/notes" },
              { title: "Reminders", icon: <FiBell />, path: "/nurse/reminders" },
              { title: "Account", icon: <FiSettings />, path: "/settings" },
            ]
          : laboratoryOnly
            ? [
                {
                  title: "Laboratory",
                  icon: <FaFlask />,
                  children: [
                    {
                      title: "Tests & Results",
                      path: "/laboratory",
                      icon: <FaFlask />,
                      badge: readyLabsCount > 0 ? readyLabsCount : null,
                      badgeClass: "labs",
                    },
                    {
                      title: "Lab Templates",
                      path: "/laboratory/templates",
                      icon: <FiFileText />,
                    },
                  ],
                },
                ...(permissions.includes("patients.investigation.create") || permissions.includes("patients.create")
                  ? [
                      {
                        title: "Patients",
                        icon: <FaUserInjured />,
                        children: [
                          {
                            title: "Register Patient",
                            path: "/register-patient",
                            icon: <FiPlusCircle />,
                          },
                        ],
                      },
                    ]
                  : []),
                {
                  title: "Account",
                  icon: <FiSettings />,
                  path: "/settings",
                },
              ]
            : pharmacyOnly
              ? [
                  {
                    title: "Pharmacy",
                    icon: <FaCapsules />,
                    path: "/pharmacy",
                  },
                  ...(permissions.includes("inventory.read")
                    ? [
                        {
                          title: "Inventory",
                          icon: <FiPackage />,
                          path: "/inventory",
                        },
                      ]
                    : []),
                  {
                    title: "Account",
                    icon: <FiSettings />,
                    path: "/settings",
                  },
                ]
              : receptionOnly || deskOfficeOnly
                ? [
                    {
                      title: "Reception Desk",
                      icon: <FiHome />,
                      path: deskOfficeOnly ? "/desk-office" : "/patients",
                    },
                    {
                      title: "Patients",
                      icon: <FaUserInjured />,
                      children: [
                        {
                          title: "Patient Directory",
                          path: "/patients",
                          icon: <FiUsers />,
                          requiredPermissions: ["patients.read"],
                        },
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
                    ...(permissions.includes("billing.read")
                      ? [
                          {
                            title: "Billing & Cashier",
                            path: "/billing",
                            icon: <FiCreditCard />,
                          },
                        ]
                      : []),
                    {
                      title: "Wards & Beds",
                      path: "/setup/wards",
                      icon: <FaBed />,
                    },
                    ...(deskOfficeOnly
                      ? [
                          {
                            title: "Desk Office",
                            path: "/desk-office",
                            icon: <FiFileText />,
                          },
                        ]
                      : []),
                    {
                      title: "Account",
                      icon: <FiSettings />,
                      path: "/settings",
                    },
                  ]
                : billingOnly
                  ? [
                      {
                        title: "Billing & Cashier",
                        path: "/billing",
                        icon: <FiCreditCard />,
                      },
                      {
                        title: "Patient Directory",
                        path: "/patients",
                        icon: <FiUsers />,
                      },
                      {
                        title: "Account",
                        icon: <FiSettings />,
                        path: "/settings",
                      },
                    ]
                  : menus;

    return sourceMenus
      .map((menu) => ({
        ...menu,
        children: menu.children?.filter(canAccess),
      }))
      .filter((menu) => canAccess(menu) && (!menu.children || menu.children.length > 0));
  }, [
    permissions,
    roles,
    securityOnly,
    doctorOnly,
    nurseOnly,
    laboratoryOnly,
    pharmacyOnly,
    receptionOnly,
    deskOfficeOnly,
    billingOnly,
    menus,
    waitingCount,
    readyLabsCount,
    nurseWaitingCount,
    pendingMedsCount,
  ]);

  const initiallyOpen = useMemo(() => {
    const openSet = new Set<string>();
    visibleMenus.forEach((menu) => {
      if (
        menu.children?.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`)
        )
      ) {
        openSet.add(menu.title);
      }
    });
    return openSet;
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
    if (location.pathname === itemPath && (!itemHash || `#${itemHash}` === location.hash)) {
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

  const isGroupActive = (item: MenuItem) =>
    item.children?.some((child) => isMenuActive(child.path)) ?? false;

  const displayName = getUserDisplayName(user);
  const primaryRole = user?.roles?.[0] ?? "Care team";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "MD";

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        data-tour-region="desktop-sidebar"
      >
        {/* Brand Header */}
        <div className="sidebar-logo">
          <Link
            to={roleHomePath}
            className="sidebar-brand-link"
            onClick={handleLinkClick}
            title="MDS Hospital Home"
          >
            <img className="logo-mark" src={mdsLogo} alt="MDS Hospital" />

            {!collapsed && (
              <div className="sidebar-brand-text">
                <h2>MDS Hospital</h2>
                <span>Staff Portal</span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              className="sidebar-mobile-close"
              onClick={onCloseMobile}
              type="button"
              aria-label="Close navigation"
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          className="collapse-btn"
          onClick={toggle}
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar (Ctrl + B)" : "Collapse sidebar (Ctrl + B)"}
          data-tour-target="sidebar-collapse"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>

        {/* Menu Navigation Items */}
        <nav className="sidebar-nav">
          {visibleMenus.map((item) => {
            const groupOpen = openGroups.has(item.title);
            const activeGroup = isGroupActive(item);

            if (item.children) {
              return (
                <div
                  key={item.title}
                  className={`sidebar-group ${activeGroup ? "active" : ""}`}
                >
                  <button
                    className={`sidebar-item sidebar-group-trigger ${activeGroup ? "group-active" : ""}`}
                    type="button"
                    onClick={() => toggleGroup(item.title)}
                    data-tour-group={tourKey(item.title)}
                    title={collapsed ? item.title : undefined}
                  >
                    <span className="icon">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="sidebar-item-label">{item.title}</span>
                        <FiChevronDown
                          className={`submenu-chevron ${groupOpen ? "open" : ""}`}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && groupOpen && (
                    <div className="sidebar-submenu">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={
                            isMenuActive(child.path)
                              ? "sidebar-subitem active"
                              : "sidebar-subitem"
                          }
                          onClick={handleLinkClick}
                          data-tour-menu-path={child.path}
                          data-tour-menu-title={tourKey(child.title)}
                        >
                          <span className="subitem-icon">{child.icon}</span>
                          <span className="subitem-label">{child.title}</span>
                          {child.badge != null && (
                            <span className={`sidebar-badge ${child.badgeClass || ""}`}>
                              {child.badge}
                            </span>
                          )}
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
                className={isMenuActive(item.path) ? "sidebar-item active" : "sidebar-item"}
                onClick={handleLinkClick}
                data-tour-menu-path={item.path ?? "/"}
                data-tour-menu-title={tourKey(item.title)}
                title={collapsed ? item.title : undefined}
              >
                <span className="icon">{item.icon}</span>
                {!collapsed ? (
                  <>
                    <span className="sidebar-item-label">{item.title}</span>
                    {item.badge != null && (
                      <span className={`sidebar-badge ${item.badgeClass || ""}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                ) : (
                  item.badge != null && (
                    <span className={`sidebar-badge-dot ${item.badgeClass || ""}`} />
                  )
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Presence Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-pwa-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
            title="Install Web App / Add to iPhone Home Screen"
            aria-label="Install App or Add to iPhone Home Screen"
          >
            <FiDownload className="icon" />
            {!collapsed && <span>Install / Add to Home</span>}
          </button>

          <Link
            to="/settings"
            className="sidebar-user-card"
            onClick={handleLinkClick}
            title="Account Settings"
          >
            <div className="user-avatar-circle">
              <span>{initials}</span>
              <span className="user-status-dot" title="Active on duty" />
            </div>

            {!collapsed && (
              <div className="sidebar-user-details">
                <strong className="sidebar-user-name">{displayName}</strong>
                <span className="sidebar-user-role">{primaryRole}</span>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
export default Sidebar;
