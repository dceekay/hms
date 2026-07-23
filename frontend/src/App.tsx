import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { PatientListPage } from "./pages/patients/PatientListPage";
import PatientRegistrationPage from "./pages/patients/PatientRegistrationPage";
import ComingSoonPage from "./pages/ComingSoonPage";

import APITesterPage from "./pages/APITesterPage";

import RolesPage from "./pages/admin/RolesPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import UsersPage from "./pages/admin/UsersPage";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { FaBed, FaCapsules, FaFlask } from "react-icons/fa";
import { FiActivity, FiCreditCard, FiDatabase, FiDroplet, FiPackage, FiPieChart, FiTool } from "react-icons/fi";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients"
        element={
          <ProtectedRoute requiredPermissions={["patients.read"]}>
            <PatientListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/register-patient"
        element={
          <ProtectedRoute requiredPermissions={["patients.create"]}>
            <PatientRegistrationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/api-tester"
        element={
          <ProtectedRoute>
            <APITesterPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Appointments"
              description="Scheduling will connect patients, doctors, services, check-in, and cancellation workflows after the patient backend is complete."
              icon={<FiActivity />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/laboratory"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Laboratory"
              description="Lab catalog, requests, specimens, results, and verification will come after clinical encounters are in place."
              icon={<FaFlask />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Pharmacy"
              description="Medicine catalog, prescriptions, dispensing, and stock movement will be built after clinical records."
              icon={<FaCapsules />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Inventory"
              description="Inventory will manage stock items, batches, movement history, and low-stock alerts."
              icon={<FiPackage />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Billing"
              description="Billing will generate invoices from services, lab requests, pharmacy dispensing, and payments."
              icon={<FiCreditCard />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Reports"
              description="Reports will summarize revenue, patient flow, appointments, pharmacy stock, lab turnaround, and bed occupancy."
              icon={<FiPieChart />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/departments"
        element={
          <ProtectedRoute requiredPermissions={["departments.read"]}>
            <ComingSoonPage
              title="Departments"
              description="Department management is available in the backend and will receive a full management screen after the API checkpoints are complete."
              icon={<FiDatabase />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/setup/wards"
        element={
          <ProtectedRoute requiredPermissions={["setup.read"]}>
            <ComingSoonPage
              title="Wards & Beds"
              description="The setup API already supports wards, rooms, and beds. Use API Tester while we build the dedicated setup screens."
              icon={<FaBed />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/setup/services"
        element={
          <ProtectedRoute requiredPermissions={["setup.read"]}>
            <ComingSoonPage
              title="Hospital Services"
              description="Service setup is available through the setup API and ready for a dedicated admin screen later."
              icon={<FiTool />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/setup/insurance"
        element={
          <ProtectedRoute requiredPermissions={["setup.read"]}>
            <ComingSoonPage
              title="Insurance Providers"
              description="Insurance provider setup is available through the setup API and will connect to patient profiles in the next backend phase."
              icon={<FiDroplet />}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredPermissions={["users.read"]}>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute requiredPermissions={["roles.read"]}>
            <RolesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/permissions"
        element={
          <ProtectedRoute requiredPermissions={["permissions.read"]}>
            <PermissionsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
