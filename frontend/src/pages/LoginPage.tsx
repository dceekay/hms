import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiChevronDown, FiChevronUp, FiLock, FiShield, FiUser, FiAlertTriangle } from "react-icons/fi";
import { Link } from "react-router-dom";
import mdsLogo from "../assets/optimized/logo-sm.webp";
import happyPatientHero from "../assets/optimized/happy-patient-hero.jpg";
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
  const [showStatutoryNotice, setShowStatutoryNotice] = useState(false);
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
          src={happyPatientHero}
          alt="Happy patient receiving care at MDS Specialist Hospital"
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
            width="52"
            height="52"
          />
          <div>
            <strong>MDS Specialist Hospital</strong>
            <small>Staff &amp; Clinical Portal</small>
          </div>
        </div>

        <div className="login-copy">
          <div className="login-statutory-pill">
            <span className="live-status-dot" aria-hidden="true" />
            <span>Patient-First Care • 24/7 Clinical Network</span>
          </div>
          <p className="eyebrow">MDS Specialist Hospital, Kano</p>
          <h1>Compassionate care, powered by smart records.</h1>
          <p>
            Fast, reliable clinical and administrative workspace for MDS doctors, nurses, lab scientists, pharmacists, and front desk staff.
          </p>
        </div>
      </section>

      <section className="login-panel-wrap">
        <form onSubmit={handleSubmit} className="login-panel">
          <div className="login-panel-header">
            <div className="login-mini-logo">
              <img src={mdsLogo} alt="MDS Logo" width="32" height="32" />
            </div>
            <div>
              <p className="eyebrow">MDS Staff Portal</p>
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

          <div className={`login-compliance-card ${showStatutoryNotice ? "expanded" : "collapsed"}`} role="region" aria-label="HMR Access and Compliance Notice">
            <button
              type="button"
              className="login-compliance-toggle"
              onClick={() => setShowStatutoryNotice((prev) => !prev)}
              aria-expanded={showStatutoryNotice}
            >
              <div className="login-live-pulse">
                <span className="live-pulse-dot" aria-hidden="true" />
                <span>Restricted HMR Access • 24/7 Monitored</span>
              </div>
              <div className="login-compliance-toggle-right">
                <span className="login-security-tag">Statutory Notice</span>
                {showStatutoryNotice ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </div>
            </button>

            {showStatutoryNotice && (
              <div className="login-compliance-body">
                <p className="login-compliance-text">
                  Notice: Access to this Hospital Medical Records (HMR) system is strictly restricted to <strong>authorized clinical and administrative personnel only</strong>. Unauthorized access, alteration, extraction, or disclosure of patient health records is strictly prohibited and subject to immediate administrative sanctions, civil liabilities, and criminal prosecution.
                </p>

                <div className="login-applicable-laws">
                  <span className="login-laws-title">Applicable Healthcare &amp; Cybersecurity Laws:</span>
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
            )}
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

