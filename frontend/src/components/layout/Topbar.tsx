import { useAuthStore } from "../../store/authStore";

export default function Topbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>
          Welcome back,
          <span> {user?.firstName}</span>
        </h2>

        <p>Have a productive day managing your hospital.</p>
      </div>

      <div className="topbar-right">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search patients, doctors..."
          />
        </div>

        <button className="icon-btn">🔔</button>

        <button className="icon-btn">⚙️</button>

        <div className="profile">
          <div className="avatar">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>

          <div>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>

            <small>
              {user?.roles?.join(", ")}
            </small>
          </div>
        </div>
      </div>
    </header>
  );
}