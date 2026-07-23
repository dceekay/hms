import AdminLayout from "../layouts/AdminLayout";
import StatCard from "../components/dashboard/StatCard";

export function DashboardPage() {
  return (
    <AdminLayout>
      <div className="dashboard">

        <div className="dashboard-header">
          <div>
            <h1>Hospital Dashboard</h1>
            <p>Real-time overview of your hospital operations.</p>
          </div>

          <button className="primary-btn">
            + Register Patient
          </button>
        </div>

        {/* Statistics */}

        <div className="stats-grid">

          <StatCard
            title="Total Patients"
            value="12,548"
            change="+8.3%"
            icon="🧑‍⚕️"
            color="#3B82F6"
          />

          <StatCard
            title="Appointments"
            value="184"
            change="+12%"
            icon="📅"
            color="#10B981"
          />

          <StatCard
            title="Revenue"
            value="$48,240"
            change="+18%"
            icon="💰"
            color="#F59E0B"
          />

          <StatCard
            title="Available Beds"
            value="42"
            change="-4%"
            icon="🛏️"
            color="#EF4444"
          />

        </div>

        {/* Middle */}

        <div className="dashboard-middle">

          <div className="dashboard-card chart-card">

            <h2>Hospital Analytics</h2>

            <div className="chart-placeholder">

              <div className="fake-chart">

                <div style={{height:"70%"}}></div>
                <div style={{height:"40%"}}></div>
                <div style={{height:"95%"}}></div>
                <div style={{height:"60%"}}></div>
                <div style={{height:"80%"}}></div>
                <div style={{height:"45%"}}></div>
                <div style={{height:"100%"}}></div>

              </div>

            </div>

          </div>

          <div className="dashboard-card activity-card">

            <h2>Recent Activities</h2>

            <ul>

              <li>🟢 New patient registered</li>

              <li>💊 Pharmacy order completed</li>

              <li>🧪 Lab report uploaded</li>

              <li>💰 Billing payment received</li>

              <li>📅 Appointment scheduled</li>

            </ul>

          </div>

        </div>

        {/* Bottom */}

        <div className="dashboard-bottom">

          <div className="dashboard-card">

            <h2>Recent Patients</h2>

            <table className="dashboard-table">

              <thead>

                <tr>

                  <th>Name</th>

                  <th>Gender</th>

                  <th>Status</th>

                </tr>

              </thead>

              <tbody>

                <tr>

                  <td>John Doe</td>

                  <td>Male</td>

                  <td><span className="badge success">Admitted</span></td>

                </tr>

                <tr>

                  <td>Mary Smith</td>

                  <td>Female</td>

                  <td><span className="badge warning">Waiting</span></td>

                </tr>

                <tr>

                  <td>David Johnson</td>

                  <td>Male</td>

                  <td><span className="badge info">Consultation</span></td>

                </tr>

              </tbody>

            </table>

          </div>

          <div className="dashboard-card">

            <h2>Quick Actions</h2>

            <div className="quick-grid">

              <button>➕ Patient</button>

              <button>📅 Appointment</button>

              <button>💊 Pharmacy</button>

              <button>🧪 Laboratory</button>

              <button>💰 Billing</button>

              <button>📊 Reports</button>

            </div>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
}