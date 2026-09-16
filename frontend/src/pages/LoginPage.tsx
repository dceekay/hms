import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiLock, FiShield, FiUser, FiUsers, FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import mdsLogo from "../assets/optimized/logo-sm.webp";
import mdsHospital from "../assets/optimized/login_bright.webp";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import PoweredByCeekayX from "../components/common/PoweredByCeekayX";
import "../styles/login.css";

interface MdsTestAccount {
  role: string;
  category: "admin" | "clinical" | "diagnostics" | "operations" | "security";
  name: string;
  username: string;
  password: string;
  badge: string;
  color: string;
}

const mdsTestAccounts: MdsTestAccount[] = [
  { role: "Super Admin", category: "admin", name: "A. Yakubu", username: "admin", password: "Admin@123", badge: "Root", color: "#ef4444" },
  { role: "Administrator", category: "admin", name: "Hosp Admin", username: "administrator", password: "Administrator@123", badge: "Admin", color: "#f97316" },
  { role: "Doctor", category: "clinical", name: "Dr. John Doe", username: "drjohn", password: "Doctor@123", badge: "Clinic", color: "#06b6d4" },
  { role: "Nurse", category: "clinical", name: "Nurse Amina", username: "nurseama", password: "Nurse@123", badge: "Triage", color: "#10b981" },
  { role: "Receptionist", category: "operations", name: "Jane Smith", username: "reception", password: "Reception@123", badge: "Front Desk", color: "#8b5cf6" },
  { role: "Laboratory", category: "diagnostics", name: "Samuel Okoro", username: "labtech", password: "Lab@12345", badge: "Diagnostics", color: "#ec4899" },
  { role: "Pharmacist", category: "diagnostics", name: "Fatima Musa", username: "pharm", password: "Pharm@123", badge: "Pharmacy", color: "#14b8a6" },
  { role: "Cashier", category: "operations", name: "Cash Desk", username: "cashier", password: "Cashier@123", badge: "POS", color: "#f59e0b" },
  { role: "Billing Officer", category: "operations", name: "David Ibrahim", username: "billing", password: "Billing@123", badge: "Billing", color: "#eab308" },
  { role: "Desk Office", category: "operations", name: "Desk Officer", username: "deskoffice", password: "Desk@123", badge: "Desk", color: "#6366f1" },
  { role: "Security", category: "security", name: "Peter Gate", username: "security", password: "Security@123", badge: "Security", color: "#64748b" },
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

  if (normalizedRoles.includes("nurse")) {
    return "/nurse";
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
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredAccounts = useMemo(() => {
    if (activeCategory === "all") return mdsTestAccounts;
    return mdsTestAccounts.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  async function submitLogin(username: string, loginPassword: string) {
    setLoading(true);
    setError(null);

    const deviceDetails = {
      screen: typeof window !== "undefined" ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : undefined,
      viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
      language: typeof navigator !== "undefined" ? navigator.language : undefined,
      networkType:
        typeof navigator !== "undefined"
          ? (navigator as any).connection?.effectiveType ||
            (navigator as any).connection?.type ||
            (navigator.onLine ? "online" : "offline")
          : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const result = await login({
      emailOrUsername: username,
      password: loginPassword,
      rememberMe,
      deviceDetails,
    });
    setLoading(false);

    if (!result?.accessToken) {
      setError("Login failed. Check your username and password.");
      return;
    }

    setToken(result.accessToken);
    setRefreshToken(result.refreshToken ?? null);
    setUser(result.user);
    navigate(getPostLoginPath(result.user?.roles, result.user?.permissions), { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitLogin(emailOrUsername, password);
  }

  const handleTestLogin = async (account: MdsTestAccount) => {
    setEmailOrUsername(account.username);
    setPassword(account.password);
    await submitLogin(account.username, account.password);
  };


  return (
    <main className="login-page">
      <section className="login-visual" aria-label="MDS staff portal overview">
        <img
          className="login-hospital-image"
          src={mdsHospital}
          alt="MDS Hospital Kano Facility"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="login-brand">
          <img
            className="login-logo"
            src={mdsLogo}
            alt="MDS Hospital Logo"
            decoding="async"
            fetchPriority="high"
            width="48"
            height="48"
          />
          <div>
            <strong>MDS Specialist Hospital</strong>
            <small>Staff & Clinical Portal</small>
          </div>
        </div>

        <div className="login-copy">
          <p className="eyebrow">MDS Specialist Hospital</p>
          <h1>Welcome to MDS staff portal.</h1>
          <p>Secure clinical and administrative portal for doctors, nurses, specialists, and hospital staff.</p>
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

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>
              <strong>Remember me for 30 days</strong>
              <small>Use this on trusted hospital devices only.</small>
            </span>
          </label>

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Signing in..." : "Sign in"}
            <FiArrowRight />
          </button>

          {error && <p className="login-error">{error}</p>}

          {!error && searchParams.get("session") === "expired" && (
            <p className="login-error">Your session expired. Please sign in again.</p>
          )}

          <div className="test-login-panel">
            <div className="test-login-panel-header">
              <div className="test-login-title-group">
                <FiUsers className="test-login-icon" />
                <div>
                  <strong>MDS Test Logins</strong>
                  <p>Click any account for instant one-click sign in</p>
                </div>
              </div>
              <span className="test-login-count">{filteredAccounts.length} Logins</span>
            </div>

            {/* Category Filter Pills */}
            <div className="test-login-categories" role="tablist" aria-label="Account role categories">
              {[
                { id: "all", label: "All", count: mdsTestAccounts.length },
                { id: "admin", label: "Admin", count: 2 },
                { id: "clinical", label: "Clinical", count: 2 },
                { id: "diagnostics", label: "Diagnostics", count: 2 },
                { id: "operations", label: "Operations", count: 4 },
                { id: "security", label: "Security", count: 1 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  className={`test-category-pill ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                  <span className="pill-count">{cat.count}</span>
                </button>
              ))}
            </div>

            <div className="test-login-grid">
              {filteredAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleTestLogin(account)}
                  className="test-login-btn"
                  disabled={loading}
                  title={`Sign in as ${account.role} (${account.username} / ${account.password})`}
                >
                  <div className="test-login-btn-top">
                    <span className="test-login-role">{account.role}</span>
                    <span
                      className="test-login-badge"
                      style={{
                        borderColor: `${account.color}50`,
                        color: account.color,
                        background: `${account.color}15`,
                      }}
                    >
                      {account.badge}
                    </span>
                  </div>
                  <div className="test-login-btn-meta">
                    <span className="test-login-user">{account.username}</span>
                    <span className="test-login-name">{account.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="login-note">
            <FiShield />
            <span>Access is protected by roles, permissions, and secure tokens.</span>
          </div>

          <Link to="/landing" className="landing-link-btn">
            View hospital landing page
            <FiArrowRight />
          </Link>

          <PoweredByCeekayX variant="login" />
        </form>
      </section>
    </main>
  );
}

