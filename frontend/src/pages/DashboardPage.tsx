import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import AdminLayout from "../layouts/AdminLayout";
import StatCard from "../components/dashboard/StatCard";
import { useAuthStore } from "../store/authStore";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiPlusCircle,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaUserNurse } from "react-icons/fa";

type DashboardAction = {
  label: string;
  to: string;
  icon: ReactNode;
  primary?: boolean;
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

const commonSyncItems = [
  "Local queue for offline patient registration",
  "Conflict-safe record versioning",
  "Background sync when backend returns online",
];

function hasRole(roles: string[], role: string) {
  return roles.some((item) => item.toLowerCase() === role.toLowerCase());
}

function buildDashboardProfile(roles: string[], permissions: string[]): DashboardProfile {
  const canCreatePatients = permissions.includes("patients.create");
  const canReadPatients = permissions.includes("patients.read");
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

  if (hasRole(roles, "Receptionist")) {
    return {
      roleLabel: "Front desk workspace",
      eyebrow: "Reception dashboard",
      title: "Register patients, manage queues, and keep visits flowing.",
      description:
        "Use this space for patient registration, appointment intake, QR-ready records, and front-desk queue tracking.",
      stats: [
        { title: "New Registrations", value: "24", change: "QR cards next", color: "#2563eb", icon: <FiUserPlus /> },
        { title: "Check-ins", value: "31", change: "8 waiting", color: "#0f766e", icon: <FiCheckCircle /> },
        { title: "Appointments", value: "62", change: "today", color: "#7c3aed", icon: <FiCalendar /> },
        { title: "Missing Insurance", value: "9", change: "complete profiles", color: "#dc2626", icon: <FiCreditCard /> },
      ],
      actions: [
        { label: "Register Patient", to: "/register-patient", icon: <FiUserPlus />, primary: true },
        { label: "Patient List", to: "/patients", icon: <FiUsers /> },
        { label: "Appointments", to: "/appointments", icon: <FiCalendar /> },
      ],
      tasks: [
        { label: "Patient registration", detail: "Capture demographics and generate QR code", time: "Next" },
        { label: "Insurance details", detail: "9 profiles need policy information", time: "Today" },
        { label: "Visit intake", detail: "Attach reason for visit before doctor queue", time: "Now" },
      ],
      load: [
        { label: "Registration", value: "74%" },
        { label: "Check-in", value: "62%" },
        { label: "Insurance", value: "38%" },
        { label: "Queue", value: "69%" },
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
      actions: [{ label: "Lab Queue", to: "/laboratory", icon: <FaFlask />, primary: true }],
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

  if (hasRole(roles, "Billing Officer") || hasRole(roles, "Accountant")) {
    return {
      roleLabel: "Accounts workspace",
      eyebrow: "Billing dashboard",
      title: "Monitor invoices, payments, insurance claims, and balances.",
      description: "This role view is ready for billing users once invoice and payment modules are connected.",
      stats: [
        { title: "Invoices", value: "44", change: "today", color: "#2563eb", icon: <FiFileText /> },
        { title: "Payments", value: "31", change: "posted", color: "#0f766e", icon: <FiCreditCard /> },
        { title: "Claims", value: "12", change: "insurance", color: "#7c3aed", icon: <FiShield /> },
        { title: "Outstanding", value: "128", change: "follow up", color: "#dc2626", icon: <FiTrendingUp /> },
      ],
      actions: [{ label: "Billing", to: "/billing", icon: <FiCreditCard />, primary: true }],
      tasks: [
        { label: "Pending bills", detail: "Review unpaid invoices", time: "Now" },
        { label: "Insurance claims", detail: "Prepare claim documentation", time: "Today" },
        { label: "Daily close", detail: "Reconcile posted payments", time: "End day" },
      ],
      load: [
        { label: "Invoices", value: "70%" },
        { label: "Payments", value: "61%" },
        { label: "Claims", value: "49%" },
        { label: "Balance", value: "52%" },
      ],
    };
  }

  return {
    roleLabel: hasRole(roles, "Super Admin") ? "Super Admin workspace" : "Administrator workspace",
    eyebrow: "Hospital command dashboard",
    title: "Smarter hospitals. Better care.",
    description:
      "Monitor operations, test backend APIs, manage access, and prepare each clinical module from one command center.",
    stats: [
      { title: "Total Patients", value: "3,428", change: "+12.4%", color: "#2563eb", icon: <FiUsers /> },
      { title: "Appointments", value: "248", change: "+8.1%", color: "#7c3aed", icon: <FiCalendar /> },
      { title: "Available Beds", value: "64", change: "+4 beds", color: "#0f766e", icon: <FaBed /> },
      { title: "Pending Bills", value: "128", change: "-3.2%", color: "#dc2626", icon: <FiCreditCard /> },
    ],
    actions: [
      ...(canCreatePatients ? [{ label: "Register Patient", to: "/register-patient", icon: <FiUserPlus />, primary: true }] : []),
      ...(canReadPatients ? [{ label: "Patient List", to: "/patients", icon: <FiUsers /> }] : []),
      ...(canTestApi ? [{ label: "Test API", to: "/api-tester", icon: <FiActivity /> }] : []),
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

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const dashboard = buildDashboardProfile(roles, permissions);

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <motion.section
          className="dashboard-command"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <p className="eyebrow">{dashboard.eyebrow}</p>
            <span className="role-context">{dashboard.roleLabel}</span>
            <h1>{dashboard.title}</h1>
            <p>{dashboard.description}</p>
          </div>

          <div className="command-actions">
            {dashboard.actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={action.primary ? "command-btn primary" : "command-btn"}
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.div
          className="stats-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {dashboard.stats.map((stat) => (
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

        <section className="sync-panel">
          <div>
            <p className="eyebrow">Online/offline sync preparation</p>
            <h2>Patient registration will be sync-ready.</h2>
            <p>
              The next patient checkpoint will prepare QR-enabled patient records and leave room for
              offline capture, queued writes, and safe background sync.
            </p>
          </div>

          <div className="sync-list">
            {commonSyncItems.map((item) => (
              <span key={item}>
                <FiRefreshCw />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="role-strip">
          {[
            { label: "Patients", icon: <FiUsers /> },
            { label: "Doctors", icon: <FiActivity /> },
            { label: "Nurses", icon: <FaUserNurse /> },
            { label: "Laboratory", icon: <FaFlask /> },
            { label: "Beds", icon: <FaBed /> },
            { label: "Billing", icon: <FiCreditCard /> },
            { label: "Setup", icon: <FiPlusCircle /> },
          ].map((item) => (
            <div className="role-tile" key={item.label}>
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
            </div>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
