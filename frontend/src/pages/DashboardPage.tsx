import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AdminLayout from "../layouts/AdminLayout";
import StatCard from "../components/dashboard/StatCard";
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiPlusCircle,
  FiTrendingUp,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { FaBed, FaFlask, FaUserNurse } from "react-icons/fa";

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const activityItems = [
  { label: "Patient registration", detail: "New outpatient profile pending review", time: "8 min" },
  { label: "Lab request", detail: "Full blood count queued for processing", time: "21 min" },
  { label: "Ward update", detail: "Bed GW-101-A marked available", time: "35 min" },
];

const departmentLoad = [
  { label: "OPD", value: "72%" },
  { label: "Laboratory", value: "58%" },
  { label: "Pharmacy", value: "44%" },
  { label: "Admissions", value: "81%" },
];

export default function DashboardPage() {
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
            <p className="eyebrow">CeekayX Hospital Management System</p>
            <h1>Smarter hospitals. Better care.</h1>
            <p>
              Monitor operations, test backend APIs, and prepare each clinical module from one
              calm command center.
            </p>
          </div>

          <div className="command-actions">
            <Link to="/register-patient" className="command-btn primary">
              <FiUserPlus />
              Register Patient
            </Link>
            <Link to="/api-tester" className="command-btn">
              <FiActivity />
              Test API
            </Link>
          </div>
        </motion.section>

        <motion.div
          className="stats-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.div variants={cardMotion}>
            <StatCard title="Total Patients" value="3,428" icon={<FiUsers />} change="+12.4%" color="#2563eb" />
          </motion.div>
          <motion.div variants={cardMotion}>
            <StatCard title="Appointments" value="248" icon={<FiCalendar />} change="+8.1%" color="#7c3aed" />
          </motion.div>
          <motion.div variants={cardMotion}>
            <StatCard title="Available Beds" value="64" icon={<FaBed />} change="+4 beds" color="#0f766e" />
          </motion.div>
          <motion.div variants={cardMotion}>
            <StatCard title="Pending Bills" value="128" icon={<FiCreditCard />} change="-3.2%" color="#dc2626" />
          </motion.div>
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
                <h2>Today&apos;s Activity</h2>
                <p>Live operational events from the current test data.</p>
              </div>
              <FiClock />
            </div>

            <div className="activity-feed">
              {activityItems.map((item) => (
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
                <h2>Department Load</h2>
                <p>Simple readiness indicators before analytics goes live.</p>
              </div>
              <FiTrendingUp />
            </div>

            <div className="load-list">
              {departmentLoad.map((item) => (
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
