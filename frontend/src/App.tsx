import { Route, Routes, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={token ? <HomePage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
