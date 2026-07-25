import { useNavigate } from "react-router-dom";
import { FiBell, FiLogOut, FiSettings } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>
          Welcome back,
          <span> {user?.firstName || "Admin"}</span>
        </h2>

        <p>Have a productive day managing your hospital.</p>
      </div>

      <div className="topbar-right">
        <div className="search-box">
          <input type="text" placeholder="Search patients, doctors..." />
        </div>

        <button className="icon-btn" type="button" aria-label="Notifications">
          <FiBell />
        </button>

        <button className="icon-btn" type="button" aria-label="Settings">
          <FiSettings />
        </button>

        <div className="profile">
          <div className="avatar">
            {user?.firstName?.charAt(0) || "A"}
            {user?.lastName?.charAt(0) || ""}
          </div>

          <div>
            <strong>
              {user?.firstName || "System"} {user?.lastName || "Admin"}
            </strong>

            <small>{user?.roles?.join(", ") || "Care team"}</small>
          </div>
        </div>

        <button className="logout-btn" type="button" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
