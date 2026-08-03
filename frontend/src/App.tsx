import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import { PatientListPage } from "./pages/patients/PatientListPage";
import PatientRegistrationPage from "./pages/patients/PatientRegistrationPage";
import SecurityEntryPage from "./pages/security/SecurityEntryPage";
import SecurityLogsPage from "./pages/security/SecurityLogsPage";
import SemsasPage from "./pages/operations/SemsasPage";
import PharmacyPage from "./pages/pharmacy/PharmacyPage";
import LaboratoryPage from "./pages/laboratory/LaboratoryPage";
import DoctorDashboardPage from "./pages/doctor/DoctorDashboardPage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import InsuranceProvidersPage from "./pages/setup/InsuranceProvidersPage";
import HospitalServicesPage from "./pages/setup/HospitalServicesPage";
import BillingPage from "./pages/billing/BillingPage";
import ComingSoonPage from "./pages/ComingSoonPage";

import APITesterPage from "./pages/APITesterPage";

import RolesPage from "./pages/admin/RolesPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import UsersPage from "./pages/admin/UsersPage";
import DoctorsPage from "./pages/admin/DoctorsPage";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { SessionExpiryWatcher } from "./components/SessionExpiryWatcher";
import { FaBed, FaCapsules } from "react-icons/fa";
import { FiDatabase, FiPieChart, FiTruck } from "react-icons/fi";

export default function App() {
  return (
    <>
      <SessionExpiryWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route
          path="/"
          element={<LandingPage />}
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
            <ProtectedRoute anyPermissions={["patients.create", "patients.investigation.create"]}>
              <PatientRegistrationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/security/entry"
          element={
            <ProtectedRoute requiredPermissions={["security.entry.create"]}>
              <SecurityEntryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/security/logs"
          element={
            <ProtectedRoute requiredPermissions={["security.entry.read"]}>
              <SecurityLogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/operations/semsas"
          element={
            <ProtectedRoute requiredPermissions={["semsas.read"]}>
              <SemsasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/api-tester"
          element={
            <ProtectedRoute requiredRoles={["Super Admin"]}>
              <APITesterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointments"
          element={
            <ProtectedRoute requiredPermissions={["appointments.read"]}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor"
          element={
            <ProtectedRoute requiredPermissions={["clinical.read"]} requiredRoles={["Doctor"]}>
              <DoctorDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/laboratory"
          element={
            <ProtectedRoute requiredPermissions={["laboratory.read"]}>
              <LaboratoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute requiredPermissions={["pharmacy.read"]}>
              <PharmacyPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredPermissions={["inventory.read"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedRoute requiredPermissions={["billing.read"]}>
              <BillingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredPermissions={["reports.read"]}>
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
            <ProtectedRoute requiredPermissions={["setup.read"]} requiredRoles={["Super Admin"]}>
              <HospitalServicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup/insurance"
          element={
            <ProtectedRoute requiredPermissions={["setup.read"]} requiredRoles={["Super Admin"]}>
              <InsuranceProvidersPage />
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
          path="/admin/doctors"
          element={
            <ProtectedRoute requiredPermissions={["users.create"]} requiredRoles={["Super Admin"]}>
              <DoctorsPage />
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
    </>
  );
}
