import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import { fetchDashboardOverview, DashboardOverview } from "../services/dashboardService";
import { useAuthStore } from "../store/authStore";

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError(null);

      const data = await fetchDashboardOverview();
      if (!data) {
        setError("Failed to load dashboard overview.");
      }

      setOverview(data);
      setLoading(false);
    }

    loadOverview();
  }, []);

  return (
    <>
      <NavBar />
      <main className="page-container dashboard-page">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">CeekayX Hospital Management System</p>
            <h1>Dashboard</h1>
            <p>
              Good day{user?.firstName ? `, ${user.firstName}` : ""}. Monitor your core hospital workflows from one protected workspace.
            </p>
          </div>
          <div className="system-status" aria-label="System status">
            <span>System status</span>
            <strong>99.9%</strong>
            <small>Operational</small>
          </div>
        </section>

        <section className="dashboard-layout">
          <div className="dashboard-main">
            <div className="panel-title">
              <h2>Operations Overview</h2>
              <p>Live testing values from your dashboard endpoint.</p>
            </div>

            {loading && <p>Loading overview...</p>}
            {error && <p className="error-text">{error}</p>}

            {overview && (
              <div className="dashboard-grid">
                <div className="stat-card">
                  <span className="stat-label">Total Patients</span>
                  <strong>{overview.patientsToday.toLocaleString()}</strong>
                  <small>Patients today</small>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Appointments</span>
                  <strong>320</strong>
                  <small>Scheduled visits</small>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Revenue</span>
                  <strong>NGN {overview.revenue.toLocaleString()}</strong>
                  <small>Today</small>
                </div>
                <div className="stat-card warning">
                  <span className="stat-label">Pending Bills</span>
                  <strong>{overview.pendingBills}</strong>
                  <small>Need review</small>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Admissions</span>
                  <strong>{overview.admissions}</strong>
                  <small>Active admissions</small>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Doctors Available</span>
                  <strong>{overview.doctorsAvailable}</strong>
                  <small>On duty</small>
                </div>
              </div>
            )}

            <div className="feature-panel">
              <div className="panel-title">
                <h2>Functional Areas</h2>
                <p>Core modules we will keep wiring into the frontend.</p>
              </div>
              <div className="role-grid">
                {["Patients", "Doctors", "Nurses", "Admin", "Laboratory", "Pharmacy", "Accounts"].map((role) => (
                  <div className="role-tile" key={role}>
                    <span aria-hidden="true">{role.slice(0, 2).toUpperCase()}</span>
                    <strong>{role}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="quick-panel">
            <div>
              <h2>Quick Actions</h2>
              <p>Use these to test the backend from the UI.</p>
            </div>
            <div className="quick-actions">
              <Link to="/register-patient">Add Patient</Link>
              <Link to="/patients">View Patients</Link>
              <Link to="/api-tester">Open API Tester</Link>
            </div>
            <div className="mini-status">
              <span>Occupied Beds</span>
              <strong>{overview?.occupiedBeds ?? "--"}</strong>
            </div>
            <div className="mini-status">
              <span>Current Role</span>
              <strong>{user?.roles?.[0] ?? "Staff"}</strong>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
