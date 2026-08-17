import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiLock, FiShield, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";
import { FaAmbulance, FaCapsules, FaFlask, FaUserMd } from "react-icons/fa";
import mdsLogo from "../assets/optimized/logo.png";
import mdsHospital from "../assets/optimized/login_back.png";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import "../styles/login.css";

const testAccounts = [
  { role: "Super Admin", username: "admin", password: "Admin@123" },
  { role: "Administrator", username: "administrator", password: "Administrator@123" },
  { role: "Doctor", username: "drjohn", password: "Doctor@123" },
  { role: "Nurse", username: "nurseama", password: "Nurse@123" },
  { role: "Receptionist", username: "reception", password: "Reception@123" },
  { role: "Laboratory", username: "labtech", password: "Lab@12345" },
  { role: "Pharmacist", username: "pharm", password: "Pharm@123" },
  { role: "Cashier", username: "cashier", password: "Cashier@123" },
  { role: "Billing Officer", username: "billing", password: "Billing@123" },
  { role: "Desk Office", username: "deskoffice", password: "Desk@123" },
  { role: "Security", username: "security", password: "Security@123" },
];

function getPostLoginPath(roles: string[] = [], permissions: string[] = []) {
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (normalizedRoles.includes("pharmacist") || normalizedRoles.includes("pharmacy")) {
    return "/pharmacy";
  }

  if (normalizedRoles.includes("laboratory")) {
    return "/laboratory";
  }

  if (normalizedRoles.includes("doctor") && permissions.includes("clinical.read")) {
    return "/doctor";
  }

  if (normalizedRoles.includes("security")) {
    return "/security/entry";
  }

  if (normalizedRoles.includes("desk office")) {
    return "/desk-office";
  }

  return "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showTestAccounts = import.meta.env.VITE_SHOW_TEST_LOGINS !== "false";

  async function submitLogin(username: string, loginPassword: string) {
    setLoading(true);
    setError(null);

    const result = await login({ emailOrUsername: username, password: loginPassword });
    setLoading(false);

    if (!result?.accessToken) {
      setError("Login failed. Check your username and password.");
      return;
    }

    setToken(result.accessToken);
    setUser(result.user);
    navigate(getPostLoginPath(result.user?.roles, result.user?.permissions), { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitLogin(emailOrUsername, password);
  }

  const loginWithTestAccount = async (account: (typeof testAccounts)[number]) => {
    setEmailOrUsername(account.username);
    setPassword(account.password);
    await submitLogin(account.username, account.password);
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="MDS staff portal overview">
        <div className="login-brand">
          <img className="login-logo" src={mdsLogo} alt="MDS Hospital Logo" decoding="async" />
          <div>
            <strong>MDS Specialist Hospital</strong>
            <small>Staff & Clinical Portal</small>
          </div>
        </div>

        <div className="login-showcase-card">
          <img
            className="login-hospital-image"
            src={mdsHospital}
            alt="MDS Hospital Kano Facility"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="showcase-badge">
            <span className="badge-pulse" />
            <span>Eastern Bypass, Giginyu, Kano • 24/7 Care</span>
          </div>
        </div>

        <div className="login-copy">
          <p className="eyebrow">MDS Specialist Hospital</p>
          <h1>Welcome to MDS staff portal.</h1>
          <p>Secure clinical and administrative portal for doctors, nurses, specialists, and hospital staff.</p>
        </div>

        <div className="login-feature-grid">
          <div className="login-feature-card">
            <div className="feature-icon-wrap emergency">
              <FaAmbulance />
            </div>
            <strong>24/7 Emergency</strong>
            <small>Trauma & Ambulance</small>
          </div>

          <div className="login-feature-card">
            <div className="feature-icon-wrap clinical">
              <FaUserMd />
            </div>
            <strong>Specialist Care</strong>
            <small>Doctors & Clinics</small>
          </div>

          <div className="login-feature-card">
            <div className="feature-icon-wrap lab">
              <FaFlask />
            </div>
            <strong>Fast Laboratory</strong>
            <small>Accurate Diagnostics</small>
          </div>

          <div className="login-feature-card">
            <div className="feature-icon-wrap pharmacy">
              <FaCapsules />
            </div>
            <strong>24hr Pharmacy</strong>
            <small>Genuine Medications</small>
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
              <p className="eyebrow">Authorized staff</p>
              <h2>Sign in</h2>
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

          {!error && searchParams.get("session") === "expired" && (
            <p className="login-error">Your session expired. Please sign in again.</p>
          )}

          <div className="login-note">
            <FiShield />
            <span>Access is protected by roles, permissions, and secure tokens.</span>
          </div>

          <Link to="/landing" className="landing-link-btn">
            View hospital landing page
            <FiArrowRight />
          </Link>

          {showTestAccounts && (
            <div className="test-login-panel">
              <div>
                <strong>Trial role logins</strong>
                <span>Click a role to sign in.</span>
              </div>

              <div className="test-login-grid">
                {testAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => loginWithTestAccount(account)}
                    className="test-login-btn"
                    disabled={loading}
                  >
                    <span>{account.role}</span>
                    <small>{account.username} / {account.password}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
