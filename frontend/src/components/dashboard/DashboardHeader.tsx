import { FiBell, FiSearch } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

export default function DashboardHeader() {
  const user = useAuthStore((state: any) => state.user);

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dashboard-header">

      <div className="dashboard-left">
        <h1>
          {greeting()}, {user?.firstName || "Administrator"} 👋
        </h1>

        <p>{today}</p>
      </div>

      <div className="dashboard-right">

        <div className="search-box">
          <FiSearch />
          <input
            placeholder="Search patients, doctors..."
          />
        </div>

        <button className="notification-btn">
          <FiBell />
          <span className="notification-dot" />
        </button>

        <div className="profile-mini">
          <img
            src={`https://ui-avatars.com/api/?name=${
              user?.firstName || "Admin"
            }`}
            alt=""
          />

          <div>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>

            <small>Administrator</small>
          </div>
        </div>

      </div>

    </div>
  );
}