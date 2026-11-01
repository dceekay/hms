import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiLock, FiShield, FiUser, FiAlertTriangle } from "react-icons/fi";
import { Link } from "react-router-dom";
import mdsLogo from "../assets/optimized/logo-sm.webp";
import mdsHospital from "../assets/optimized/22mds.webp";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import PoweredByCeekayX from "../components/common/PoweredByCeekayX";
import "../styles/login.css";

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
          <div className="login-statutory-pill">
            <span className="live-status-dot" aria-hidden="true" />
            <span>24/7 Monitored Clinical Network</span>
          </div>
          <p className="eyebrow">MDS Specialist Hospital</p>
          <h1>Welcome to MDS staff portal.</h1>
          <p>
            Secure clinical and administrative portal for authorized hospital personnel. All Hospital Medical Records (HMR) and electronic health transactions are actively monitored 24/7 for patient safety, data integrity, and statutory compliance.
          </p>
          <div className="login-law-badges">
            <span>NDPA 2023 Compliant</span>
            <span>Cybercrimes Act 2015</span>
            <span>National Health Act 2014</span>
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

          <div className="login-compliance-card" role="region" aria-label="HMR Access and Compliance Notice">
            <div className="login-compliance-header">
              <div className="login-live-pulse">
                <span className="live-pulse-dot" aria-hidden="true" />
                <span>Restricted HMR Access • 24/7 Monitored</span>
              </div>
              <span className="login-security-tag">Statutory Notice</span>
            </div>

            <p className="login-compliance-text">
              Notice: Access to this Hospital Medical Records (HMR) system is strictly restricted to <strong>authorized clinical and administrative personnel only</strong>. Unauthorized access, alteration, extraction, or disclosure of patient health records is strictly prohibited and subject to immediate administrative sanctions, civil liabilities, and criminal prosecution.
            </p>

            <div className="login-applicable-laws">
              <span className="login-laws-title">Applicable Healthcare & Cybersecurity Laws:</span>
              <ul className="login-laws-list">
                <li>
                  <strong>Nigeria Data Protection Act (NDPA) 2023:</strong> Strict protection of sensitive personal health and biometric data.
                </li>
                <li>
                  <strong>Cybercrimes (Prohibition, Prevention, etc.) Act 2015:</strong> Criminal penalties for unauthorized system penetration, data alteration, and breaches.
                </li>
                <li>
                  <strong>National Health Act 2014 (Sections 26–29):</strong> Statutory confidentiality and mandatory protection of health records.
                </li>
                <li>
                  <strong>MDCN Code of Medical Ethics:</strong> Strict professional confidentiality and duty of care regarding medical privacy.
                </li>
              </ul>
            </div>

            <div className="login-audit-warning">
              <FiAlertTriangle className="audit-icon" aria-hidden="true" />
              <div>
                <strong>Notice: Active 24/7 Audit Logging</strong>
                <div>All user sessions, patient record lookups, modifications, and IP addresses are continuously logged, cryptographically fingerprinted, and monitored 24/7.</div>
              </div>
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

