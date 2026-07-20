import { Route, Routes, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientRegistrationPage } from "./pages/patients/PatientRegistrationPage";
import { PatientListPage } from "./pages/patients/PatientListPage";
import { APITesterPage } from "./pages/APITesterPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={token ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/register-patient"
          element={token ? <PatientRegistrationPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/patients"
          element={token ? <PatientListPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/home"
          element={token ? <HomePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/api-tester"
          element={token ? <APITesterPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
