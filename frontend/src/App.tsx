import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { PatientListPage } from "./pages/patients/PatientListPage";
import PatientRegistrationPage from "./pages/patients/PatientRegistrationPage";

import APITesterPage from "./pages/APITesterPage";

import RolesPage from "./pages/admin/RolesPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import UsersPage from "./pages/admin/UsersPage";

import { ProtectedRoute } from "./components/ProtectedRoute";

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
