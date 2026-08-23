import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiLock, FiShield, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";
import mdsLogo from "../assets/optimized/logo.png";
import mdsHospital from "../assets/optimized/login_back.png";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
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

    const result = await login({ emailOrUsername: username, password: loginPassword, rememberMe });
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
          <img className="login-logo" src={mdsLogo} alt="MDS Hospital Logo" decoding="async" />
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

          <div className="login-note">
            <FiShield />
            <span>Access is protected by roles, permissions, and secure tokens.</span>
          </div>

          <Link to="/landing" className="landing-link-btn">
            View hospital landing page
            <FiArrowRight />
          </Link>
        </form>
      </section>
    </main>
  );
}




