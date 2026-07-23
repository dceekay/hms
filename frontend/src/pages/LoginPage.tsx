import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiShield, FiUser } from "react-icons/fi";
import { FaBed, FaHospital, FaUserMd } from "react-icons/fa";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import "../styles/login.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login({ emailOrUsername, password });
    setLoading(false);

    if (!result?.accessToken) {
      setError("Login failed. Check your username and password.");
      return;
    }

    setToken(result.accessToken);
    setUser(result.user);
    navigate("/");
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="CeekayX HMS overview">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <span>CX</span>
          </div>
          <div>
            <strong>CeekayX HMS</strong>
            <small>Hospital Management System</small>
          </div>
        </div>

        <div className="hospital-picture" role="img" aria-label="Modern hospital command center">
          <div className="hospital-building">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="hospital-cross">+</div>
          <div className="command-screen screen-one" />
          <div className="command-screen screen-two" />
          <div className="command-screen screen-three" />
        </div>

        <div className="login-copy">
          <p className="eyebrow">Smarter hospitals. Better care.</p>
          <h1>One secure workspace for hospital operations.</h1>
          <p>
            Manage patients, appointments, wards, billing, laboratory requests, pharmacy workflows,
            users, roles, and reporting from a single RBAC-protected platform.
          </p>
        </div>

        <div className="login-feature-grid">
          <div>
            <FaHospital />
            <span>Operations</span>
          </div>
          <div>
            <FaUserMd />
            <span>Clinical Care</span>
          </div>
          <div>
            <FaBed />
            <span>Wards & Beds</span>
          </div>
          <div>
            <FiShield />
            <span>Secure RBAC</span>
          </div>
        </div>
      </section>

      <section className="login-panel-wrap">
        <form onSubmit={handleSubmit} className="login-panel">
          <div className="login-panel-header">
            <div className="login-mini-logo" aria-hidden="true">
              <FiLock />
            </div>
            <div>
              <p className="eyebrow">Authorized access</p>
              <h2>Sign in to dashboard</h2>
            </div>
          </div>

          <label className="login-field">
            <span>Email or username</span>
            <div>
              <FiUser />
              <input
                placeholder="admin"
                value={emailOrUsername}
                onChange={(event) => setEmailOrUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div>
              <FiLock />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Signing in..." : "Sign in"}
            <FiArrowRight />
          </button>

          {error && <p className="login-error">{error}</p>}

          <div className="login-note">
            <FiShield />
            <span>Access is protected by roles, permissions, and secure tokens.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
