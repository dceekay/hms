import { Link, Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import AdminLayout from "../layouts/AdminLayout";
import StatCard from "../components/dashboard/StatCard";
import FrontDeskWorkspace from "../components/dashboard/FrontDeskWorkspace";
import { useAuthStore } from "../store/authStore";
import { queryKeys } from "../lib/queryClient";
import {
  fetchDashboardOverview,
  DashboardOverview,
} from "../services/dashboardService";
import {
  FiActivity,
  FiArchive,
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiTruck,
  FiUserPlus,
  FiTool,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaHospitalUser, FaUserNurse } from "react-icons/fa";

type DashboardAction = {
  label: string;
  to: string;
  icon: ReactNode;
  primary?: boolean;
  detail?: string;
  tone?: "blue" | "teal" | "purple" | "rose" | "amber" | "slate";
};

type DashboardProfile = {
  roleLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{
    title: string;
    value: string;
    change: string;
    color: string;
    icon: ReactNode;
  }>;
  actions: DashboardAction[];
  tasks: Array<{
    label: string;
    detail: string;
    time: string;
  }>;
  load: Array<{
    label: string;
    value: string;
  }>;
};

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};


function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function hasRole(roles: string[], role: string) {
  return roles.some((item) => item.toLowerCase() === role.toLowerCase());
}

function formatNumber(value?: number | string | null) {
  return Number(value ?? 0).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCategory(value: string) {
  const labels: Record<string, string> = {
    new_patient: "New patient",
    old_patient: "Old patient",
    investigation_patient: "Investigation",
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

function formatTransferType(value: string) {
  const labels: Record<string, string> = {
    hospital_ambulance_to_other_hospital: "MDS to other hospital",
    hospital_ambulance_to_this_hospital: "MDS ambulance inbound",
    external_ambulance_to_this_hospital: "External ambulance inbound",
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

function adminStats(overview: DashboardOverview | null) {
  if (!overview) {
    return [
      { title: "Total Patients", value: "...", change: "loading", color: "#2563eb", icon: <FiUsers /> },
      { title: "Monthly Billing", value: "...", change: "loading", color: "#0f766e", icon: <FiCreditCard /> },
      { title: "Active Staff", value: "...", change: "loading", color: "#7c3aed", icon: <FiShield /> },
      { title: "Open Operations", value: "...", change: "loading", color: "#dc2626", icon: <FiActivity /> },
    ];
  }

  return [
    {
      title: "Total Patients",
      value: formatNumber(overview.patients.total),
      change: `${overview.patients.registeredToday} registered today`,
      color: "#2563eb",
      icon: <FiUsers />,
    },
    {
      title: "Monthly Billing",
      value: money(Number(overview.billing.monthAmount)),
      change: `${overview.billing.monthBillCount} bills this month`,
      color: "#0f766e",
      icon: <FiCreditCard />,
    },
    {
      title: "Active Staff",
      value: formatNumber(overview.users.active),
      change: `${overview.users.inactive} inactive staff`,
      color: "#7c3aed",
      icon: <FiShield />,
    },
    {
      title: "Open Operations",
      value: formatNumber(
        overview.billing.pendingBills +
          overview.operations.semsas.unfiled +
          overview.operations.security.currentlyInside
      ),
      change: "Pending bills, SEMSAS & security logs",
      color: "#dc2626",
      icon: <FiActivity />,
    },
  ];
}

function frontDeskStats(overview: DashboardOverview | null) {
  if (!overview) {
    return [
      { title: "Patients", value: "...", change: "loading", color: "#2563eb", icon: <FiUsers /> },
      { title: "Doctors Available", value: "...", change: "loading", color: "#0f766e", icon: <FiActivity /> },
      { title: "Appointments", value: "Ready", change: "open scheduler", color: "#7c3aed", icon: <FiCalendar /> },
      { title: "Bills to Receive", value: "...", change: "loading", color: "#dc2626", icon: <FiCreditCard /> },
    ];
  }

  return [
    {
      title: "Patients",
      value: formatNumber(overview.patients.active),
      change: `${overview.patients.registeredToday} new today`,
      color: "#2563eb",
      icon: <FiUsers />,
    },
    {
      title: "Doctors Available",
      value: formatNumber(overview.users.doctorsAvailable),
      change: "active doctors",
      color: "#0f766e",
      icon: <FiActivity />,
    },
    {
      title: "Appointments",
      value: "Ready",
      change: "schedule from desk",
      color: "#7c3aed",
      icon: <FiCalendar />,
    },
    {
      title: "Bills to Receive",
      value: formatNumber(overview.billing.pendingBills),
      change: "pending patient bills",
      color: "#dc2626",
      icon: <FiCreditCard />,
    },
  ];
}

function buildDashboardProfile(roles: string[], permissions: string[]): DashboardProfile {
  const canCreatePatients = permissions.includes("patients.create");
  const canCreateInvestigationPatients = permissions.includes("patients.investigation.create");
  const canReadPatients = permissions.includes("patients.read");
  const canReadAppointments = permissions.includes("appointments.read");
  const canReadBilling = permissions.includes("billing.read");
  const canReadLab = permissions.includes("laboratory.read");
  const canReadPharmacy = permissions.includes("pharmacy.read");
  const canReadInventory = permissions.includes("inventory.read");
  const canReadReports = permissions.includes("reports.read");
  const isSuperAdmin = hasRole(roles, "Super Admin");
  const canTestApi = permissions.includes("setup.read") || permissions.includes("users.read");

  if (hasRole(roles, "Doctor")) {
    return {
      roleLabel: "Doctor workspace",
      eyebrow: "Clinical care dashboard",
      title: "Your rounds, visits, and patient context in one place.",
      description:
        "Review assigned patients, upcoming consultations, lab follow-ups, prescriptions, and visit notes before we connect the full EMR module.",
      stats: [
        { title: "Today Visits", value: "18", change: "6 awaiting notes", color: "#2563eb", icon: <FiCalendar /> },
        { title: "Assigned Patients", value: "42", change: "12 active cases", color: "#0f766e", icon: <FiUsers /> },
        { title: "Lab Follow-ups", value: "7", change: "3 urgent", color: "#7c3aed", icon: <FaFlask /> },
        { title: "Pending Notes", value: "6", change: "complete today", color: "#dc2626", icon: <FiFileText /> },
      ],
      actions: [
        { label: "View Patients", to: "/patients", icon: <FiUsers />, primary: true },
        { label: "Appointments", to: "/appointments", icon: <FiCalendar /> },
        { label: "Lab Queue", to: "/laboratory", icon: <FaFlask /> },
      ],
      tasks: [
        { label: "Consultation queue", detail: "Grace Adeyemi is ready for OPD review", time: "Now" },
        { label: "Lab result review", detail: "CBC result pending doctor verification", time: "21 min" },
        { label: "Visit documentation", detail: "6 encounters need clinical notes", time: "Today" },
      ],
      load: [
        { label: "OPD", value: "76%" },
        { label: "Follow-ups", value: "58%" },
        { label: "Lab Review", value: "42%" },
        { label: "Notes", value: "64%" },
      ],
    };
  }

  if (hasRole(roles, "Nurse")) {
    return {
      roleLabel: "Nursing workspace",
      eyebrow: "Ward care dashboard",
      title: "Keep ward activity, vitals, and care tasks moving.",
      description:
        "Track bedside tasks, patient monitoring, handover items, and bed readiness while the clinical records module is built.",
      stats: [
        { title: "Ward Patients", value: "26", change: "4 high attention", color: "#2563eb", icon: <FaBed /> },
        { title: "Vitals Due", value: "12", change: "next round", color: "#dc2626", icon: <FiActivity /> },
        { title: "Discharge Prep", value: "5", change: "pending review", color: "#0f766e", icon: <FiCheckCircle /> },
        { title: "Handover Notes", value: "9", change: "shift summary", color: "#7c3aed", icon: <FaUserNurse /> },
      ],
      actions: [
        { label: "Patient List", to: "/patients", icon: <FiUsers />, primary: true },
        { label: "Wards & Beds", to: "/setup/wards", icon: <FaBed /> },
      ],
      tasks: [
        { label: "Vitals round", detail: "12 patients are due for vital signs", time: "Next" },
        { label: "Bed readiness", detail: "GW-101-A is available after cleaning", time: "35 min" },
        { label: "Shift handover", detail: "Prepare notes for evening shift", time: "Today" },
      ],
      load: [
        { label: "General Ward", value: "81%" },
        { label: "Vitals", value: "66%" },
        { label: "Handover", value: "48%" },
        { label: "Bed Prep", value: "52%" },
      ],
    };
  }

  if (
    hasRole(roles, "Receptionist") ||
    hasRole(roles, "Billing Officer") ||
    hasRole(roles, "Cashier")
  ) {
    return {
      roleLabel: "Reception & Cashier",
      eyebrow: "Front desk workspace",
      title: "Welcome patients, connect them to doctors, and keep visits moving.",
      description:
        "Register patients, check doctor availability, schedule appointments, and receive billing handoffs from one friendly workspace.",
      stats: [
        { title: "Patients", value: "Ready", change: "find or register", color: "#2563eb", icon: <FiUsers /> },
        { title: "Doctors Available", value: "Live", change: "see list below", color: "#0f766e", icon: <FiActivity /> },
        { title: "Appointments", value: "Ready", change: "schedule visit", color: "#7c3aed", icon: <FiCalendar /> },
        { title: "Bills to Receive", value: "Queue", change: "no money shown here", color: "#dc2626", icon: <FiCreditCard /> },
      ],
      actions: [
        { label: "Register Patient", to: "/register-patient", icon: <FiUserPlus />, primary: true },
        { label: "Patient List", to: "/patients", icon: <FiUsers /> },
        { label: "Schedule Appointment", to: "/appointments", icon: <FiCalendar /> },
        ...(permissions.includes("billing.read")
          ? [{ label: "Billing Desk", to: "/billing", icon: <FiCreditCard /> }]
          : []),
      ],
      tasks: [
        { label: "Greet and identify", detail: "Search by name, phone, MRN, or create a new profile", time: "Step 1" },
        { label: "Choose doctor", detail: "Check available doctors before scheduling the visit", time: "Step 2" },
        { label: "Complete handoff", detail: "Send patient to consultation or billing queue", time: "Step 3" },
      ],
      load: [
        { label: "Registration", value: "74%" },
        { label: "Doctor Scheduling", value: "62%" },
        { label: "Payment Handoff", value: "48%" },
        { label: "Patient Queue", value: "69%" },
      ],
    };
  }

  if (hasRole(roles, "Laboratory")) {
    return {
      roleLabel: "Laboratory workspace",
      eyebrow: "Lab operations dashboard",
      title: "Track lab requests, specimens, results, and verification.",
      description: "This role view is ready for the lab module once lab users and permissions are seeded.",
      stats: [
        { title: "Requests", value: "19", change: "7 pending", color: "#2563eb", icon: <FaFlask /> },
        { title: "Specimens", value: "14", change: "in process", color: "#7c3aed", icon: <FiDatabase /> },
        { title: "Results", value: "8", change: "ready", color: "#0f766e", icon: <FiCheckCircle /> },
        { title: "Urgent", value: "3", change: "priority", color: "#dc2626", icon: <FiActivity /> },
      ],
      actions: [
        ...(canCreateInvestigationPatients
          ? [{ label: "Register Investigation", to: "/register-patient", icon: <FiUserPlus />, primary: true }]
          : []),
        { label: "Lab Queue", to: "/laboratory", icon: <FaFlask />, primary: !canCreateInvestigationPatients },
        { label: "Patient List", to: "/patients", icon: <FiUsers /> },
      ],
      tasks: [
        { label: "Specimen queue", detail: "Pending collections and processing", time: "Now" },
        { label: "Result entry", detail: "Record structured lab results", time: "Today" },
        { label: "Verification", detail: "Senior lab review before release", time: "Next" },
      ],
      load: [
        { label: "Collection", value: "48%" },
        { label: "Processing", value: "72%" },
        { label: "Verification", value: "44%" },
        { label: "Release", value: "63%" },
      ],
    };
  }

  if (hasRole(roles, "Pharmacist") || hasRole(roles, "Pharmacy")) {
    return {
      roleLabel: "Pharmacy workspace",
      eyebrow: "Pharmacy dashboard",
      title: "Manage prescriptions, dispensing, and medicine stock.",
      description: "This role view is ready for pharmacy users once prescription and inventory modules are connected.",
      stats: [
        { title: "Prescriptions", value: "27", change: "11 pending", color: "#2563eb", icon: <FaCapsules /> },
        { title: "Dispensed", value: "16", change: "today", color: "#0f766e", icon: <FiCheckCircle /> },
        { title: "Low Stock", value: "8", change: "reorder", color: "#dc2626", icon: <FiDatabase /> },
        { title: "Returns", value: "2", change: "review", color: "#7c3aed", icon: <FiRefreshCw /> },
      ],
      actions: [{ label: "Pharmacy", to: "/pharmacy", icon: <FaCapsules />, primary: true }],
      tasks: [
        { label: "Dispensing queue", detail: "Validate prescriptions before release", time: "Now" },
        { label: "Stock movement", detail: "Track batches and expiry dates", time: "Today" },
        { label: "Reorder list", detail: "8 medicines under minimum level", time: "Next" },
      ],
      load: [
        { label: "Queue", value: "63%" },
        { label: "Dispensing", value: "54%" },
        { label: "Stock", value: "78%" },
        { label: "Reorder", value: "41%" },
      ],
    };
  }

  return {
    roleLabel: hasRole(roles, "Super Admin") ? "Super Admin" : "Administrator",
    eyebrow: "Operations",
    title: "Command Center",
    description:
      "Manage access, patient flow, setup data, and monthly operations from one focused workspace.",
    stats: [
      { title: "Total Patients", value: "3,428", change: "+12.4%", color: "#2563eb", icon: <FiUsers /> },
      { title: "Appointments", value: "248", change: "+8.1%", color: "#7c3aed", icon: <FiCalendar /> },
      { title: "Available Beds", value: "64", change: "+4 beds", color: "#0f766e", icon: <FaBed /> },
      { title: "Pending Bills", value: "128", change: "-3.2%", color: "#dc2626", icon: <FiCreditCard /> },
    ],
    actions: [
      ...(permissions.includes("users.read") ? [{ label: "Users", to: "/admin/users", icon: <FiUsers />, primary: true, detail: "Create staff, reset access", tone: "blue" as const }] : []),
      ...(isSuperAdmin ? [{ label: "Doctors", to: "/admin/doctors", icon: <FaHospitalUser />, detail: "Add doctors and IDs", tone: "teal" as const }] : []),
      ...(canCreatePatients ? [{ label: "Register Patient", to: "/register-patient", icon: <FiUserPlus />, detail: "New patient intake", tone: "purple" as const }] : []),
      ...(canReadPatients ? [{ label: "Patients", to: "/patients", icon: <FiUsers />, detail: "Find records and ID cards", tone: "slate" as const }] : []),
      ...(canReadAppointments ? [{ label: "Appointments", to: "/appointments", icon: <FiCalendar />, detail: "Doctor assignment queue", tone: "blue" as const }] : []),
      ...(canReadBilling ? [{ label: "Billing", to: "/billing", icon: <FiCreditCard />, detail: "Invoices and receipts", tone: "teal" as const }] : []),
      ...(canReadLab ? [{ label: "Laboratory", to: "/laboratory", icon: <FaFlask />, detail: "Requests and results", tone: "purple" as const }] : []),
      ...(canReadPharmacy ? [{ label: "Pharmacy", to: "/pharmacy", icon: <FaCapsules />, detail: "Sales and stock", tone: "rose" as const }] : []),
      ...(permissions.includes("semsas.read") ? [{ label: "SEMSAS", to: "/operations/semsas", icon: <FiTruck />, detail: "Ambulance service records", tone: "amber" as const }] : []),
      ...(canReadInventory ? [{ label: "Inventory", to: "/inventory", icon: <FiDatabase />, detail: "Hospital materials", tone: "slate" as const }] : []),
      ...(isSuperAdmin ? [{ label: "Insurance", to: "/setup/insurance", icon: <FiShield />, detail: "Schemes and percentages", tone: "blue" as const }] : []),
      ...(isSuperAdmin ? [{ label: "Services", to: "/setup/services", icon: <FiTool />, detail: "Hospital service setup", tone: "teal" as const }] : []),
      ...(canReadReports ? [{ label: "Reports", to: "/reports", icon: <FiBarChart2 />, detail: "System summaries", tone: "purple" as const }] : []),
      ...(canTestApi ? [{ label: "Test API", to: "/api-tester", icon: <FiActivity />, detail: "Developer checks", tone: "slate" as const }] : []),
    ],
    tasks: [
      { label: "Patient registration", detail: "New outpatient profile pending QR generation", time: "8 min" },
      { label: "Lab request", detail: "Full blood count queued for processing", time: "21 min" },
      { label: "Ward update", detail: "Bed GW-101-A marked available", time: "35 min" },
    ],
    load: [
      { label: "OPD", value: "72%" },
      { label: "Laboratory", value: "58%" },
      { label: "Pharmacy", value: "44%" },
      { label: "Admissions", value: "81%" },
    ],
  };
}


function roleActionTone(index: number, action: DashboardAction) {
  if (action.tone) return action.tone;
  if (action.primary) return "blue";
  return (["teal", "purple", "amber", "slate"] as const)[index % 4];
}

function RoleActionGrid({ actions }: { actions: DashboardAction[] }) {
  return (
    <section className="role-action-grid" aria-label="Role shortcuts">
      {actions.map((action, index) => (
        <Link
          className={`role-action-card tone-${roleActionTone(index, action)} ${action.primary ? "primary" : ""}`}
          to={action.to}
          key={`${action.label}-${action.to}`}
        >
          <span className="role-action-icon">{action.icon}</span>
          <span className="role-action-copy">
            <strong>{action.label}</strong>
            {action.detail && <small>{action.detail}</small>}
          </span>
          <FiArrowRight className="role-action-arrow" />
        </Link>
      ))}
    </section>
  );
}
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const isSecurityUser = hasRole(roles, "Security");
  const isPharmacyUser = hasRole(roles, "Pharmacist") || hasRole(roles, "Pharmacy");
  const isDoctorUser = hasRole(roles, "Doctor");
  const isNurseUser = hasRole(roles, "Nurse");
  const canUseDoctorDesk = permissions.includes("clinical.read");
  const isAdminDashboard =
    hasRole(roles, "Super Admin") || hasRole(roles, "Administrator");
  const isFrontDeskDashboard =
    hasRole(roles, "Receptionist") ||
    hasRole(roles, "Billing Officer") ||
    hasRole(roles, "Cashier");
  const dashboard = buildDashboardProfile(roles, permissions);
  const {
    data: overview = null,
    isFetching: overviewLoading,
  } = useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: fetchDashboardOverview,
    enabled: isAdminDashboard || isFrontDeskDashboard,
    refetchInterval: 10000,
  });
  const displayStats = isAdminDashboard
    ? adminStats(overview)
    : isFrontDeskDashboard
      ? frontDeskStats(overview)
      : dashboard.stats;

  if (isSecurityUser) {
    return <Navigate to="/security/entry" replace />;
  }

  if (isPharmacyUser) {
    return <Navigate to="/pharmacy" replace />;
  }

  if (isDoctorUser && canUseDoctorDesk) {
    return <Navigate to="/doctor" replace />;
  }

  if (isNurseUser) {
    return <Navigate to="/nurse" replace />;
  }

  if (isFrontDeskDashboard) {
    return (
      <AdminLayout>
        <div className="dashboard-page reception-dashboard-page">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <FrontDeskWorkspace
              overview={overview}
              overviewLoading={overviewLoading}
              permissions={permissions}
            />
          </motion.section>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <motion.section
          className="role-home-header"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <p className="eyebrow">{dashboard.eyebrow}</p>
            <h1>{dashboard.roleLabel}</h1>
            <p>{dashboard.description}</p>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <RoleActionGrid actions={dashboard.actions} />
        </motion.div>

        <motion.div
          className="stats-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {displayStats.map((stat) => (
            <motion.div variants={cardMotion} key={stat.title}>
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                change={stat.change}
                color={stat.color}
              />
            </motion.div>
          ))}
        </motion.div>

        {isAdminDashboard && (
          <motion.section
            className="admin-overview-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <article className="dashboard-panel admin-insight-card">
              <div className="panel-title">
                <div>
                  <h2>Patient Flow</h2>
                  <p>Live patient categories and active records.</p>
                </div>
                <FiUsers />
              </div>

              <div className="insight-metric">
                <strong>{overviewLoading ? "..." : formatNumber(overview?.patients.active)}</strong>
                <span>active patients</span>
              </div>

              <div className="metric-bars">
                {[
                  {
                    label: "New",
                    value: overview?.patients.categories.newPatients ?? 0,
                    total: overview?.patients.total ?? 0,
                  },
                  {
                    label: "Investigation",
                    value: overview?.patients.categories.investigationPatients ?? 0,
                    total: overview?.patients.total ?? 0,
                  },
                  {
                    label: "Old",
                    value: overview?.patients.categories.oldPatients ?? 0,
                    total: overview?.patients.total ?? 0,
                  },
                ].map((item) => (
                  <div className="metric-bar" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{formatNumber(item.value)}</strong>
                    </div>
                    <div className="load-track">
                      <span
                        style={{
                          width: item.total
                            ? `${Math.max(8, (item.value / item.total) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel admin-insight-card">
              <div className="panel-title">
                <div>
                  <h2>Billing Health</h2>
                  <p>Charges and outstanding patient bills.</p>
                </div>
                <FiCreditCard />
              </div>

              <div className="finance-grid">
                <span>
                  <small>Pending</small>
                  <strong>{money(Number(overview?.billing.pendingAmount ?? 0))}</strong>
                </span>
                <span>
                  <small>Paid</small>
                  <strong>{money(Number(overview?.billing.paidAmount ?? 0))}</strong>
                </span>
                <span>
                  <small>Pending bills</small>
                  <strong>{formatNumber(overview?.billing.pendingBills)}</strong>
                </span>
                <span>
                  <small>Total bills</small>
                  <strong>{formatNumber(overview?.billing.totalBills)}</strong>
                </span>
              </div>
            </article>

            <article className="dashboard-panel admin-insight-card">
              <div className="panel-title">
                <div>
                  <h2>Operations</h2>
                  <p>SEMSAS, security, and bed status.</p>
                </div>
                <FiArchive />
              </div>

              <div className="operations-stack">
                <span>
                  <small>SEMSAS unfiled</small>
                  <strong>{formatNumber(overview?.operations.semsas.unfiled)}</strong>
                </span>
                <span>
                  <small>Unfiled amount</small>
                  <strong>{money(Number(overview?.operations.semsas.unfiledAmount ?? 0))}</strong>
                </span>
                <span>
                  <small>Inside facility</small>
                  <strong>{formatNumber(overview?.operations.security.currentlyInside)}</strong>
                </span>
                <span>
                  <small>Beds available</small>
                  <strong>
                    {formatNumber(overview?.operations.beds.available)} / {formatNumber(overview?.operations.beds.total)}
                  </strong>
                </span>
              </div>
            </article>
          </motion.section>
        )}

        {isAdminDashboard && (
          <motion.section
            className="admin-operations-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <article className="dashboard-panel">
              <div className="panel-title">
                <div>
                  <h2>Service Revenue</h2>
                  <p>Billing totals by service for this month.</p>
                </div>
                <FiBarChart2 />
              </div>

              <div className="ranked-list">
                {(overview?.billing.serviceRevenue ?? []).slice(0, 6).map((service) => (
                  <div className="ranked-row" key={service.id}>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.billCount} bill(s)</small>
                    </span>
                    <b>{money(service.totalAmount)}</b>
                  </div>
                ))}

                {!overviewLoading && (overview?.billing.serviceRevenue.length ?? 0) === 0 && (
                  <p className="muted-text">No service billing recorded this month.</p>
                )}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-title">
                <div>
                  <h2>Staff by Service</h2>
                  <p>Where active accounts are assigned.</p>
                </div>
                <FiShield />
              </div>

              <div className="ranked-list">
                {(overview?.users.byService ?? []).slice(0, 6).map((service) => (
                  <div className="ranked-row" key={service.id}>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.code || "No code"}</small>
                    </span>
                    <b>{service.activeUsers}/{service.totalUsers}</b>
                  </div>
                ))}

                {!overviewLoading && (overview?.users.byService.length ?? 0) === 0 && (
                  <p className="muted-text">No staff service assignments yet.</p>
                )}
              </div>
            </article>
          </motion.section>
        )}

        {isAdminDashboard && (
          <motion.section
            className="admin-recent-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <article className="dashboard-panel">
              <div className="panel-title">
                <div>
                  <h2>Recent Patients</h2>
                  <p>Latest registered records.</p>
                </div>
                <FiUsers />
              </div>

              <div className="compact-activity-list">
                {(overview?.recent.patients ?? []).map((patient) => (
                  <div className="compact-activity-row" key={patient.id}>
                    <div>
                      <strong>{patient.name}</strong>
                      <small>{patient.mrn || "MRN pending"} | {formatCategory(patient.category)}</small>
                    </div>
                    <span>{formatDate(patient.createdAt)}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-title">
                <div>
                  <h2>Recent Bills</h2>
                  <p>Latest patient charges.</p>
                </div>
                <FiCreditCard />
              </div>

              <div className="compact-activity-list">
                {(overview?.recent.bills ?? []).map((bill) => (
                  <div className="compact-activity-row" key={bill.id}>
                    <div>
                      <strong>{bill.invoiceNumber}</strong>
                      <small>{bill.patientName} | {bill.serviceName}</small>
                    </div>
                    <span>{money(Number(bill.totalAmount))}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-title">
                <div>
                  <h2>Recent SEMSAS</h2>
                  <p>Latest ambulance service records.</p>
                </div>
                <FiTruck />
              </div>

              <div className="compact-activity-list">
                {(overview?.recent.semsas ?? []).map((transfer) => (
                  <div className="compact-activity-row" key={transfer.id}>
                    <div>
                      <strong>{transfer.patientName}</strong>
                      <small>{formatTransferType(transfer.transferType)}</small>
                    </div>
                    <span>{transfer.filedAt ? "Filed" : money(Number(transfer.feeAmount))}</span>
                  </div>
                ))}
              </div>
            </article>
          </motion.section>
        )}

        {isFrontDeskDashboard && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <FrontDeskWorkspace
              overview={overview}
              overviewLoading={overviewLoading}
              permissions={permissions}
            />
          </motion.section>
        )}

        {!isAdminDashboard && !isFrontDeskDashboard && (
        <div className="dashboard-panels">
          <motion.section
            className="dashboard-panel activity-panel"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="panel-title">
              <div>
                <h2>Priority Work</h2>
                <p>Role-specific work queue for the current checkpoint.</p>
              </div>
              <FiClock />
            </div>

            <div className="activity-feed">
              {dashboard.tasks.map((item) => (
                <div className="activity-item" key={item.label}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <small>{item.time}</small>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="dashboard-panel"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="panel-title">
              <div>
                <h2>Workload</h2>
                <p>Temporary operating signals until live analytics is connected.</p>
              </div>
              <FiTrendingUp />
            </div>

            <div className="load-list">
              {dashboard.load.map((item) => (
                <div className="load-item" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="load-track">
                    <span style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
        )}

      </div>
    </AdminLayout>
  );
}

