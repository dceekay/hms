import { useAuthStore } from "../store/authStore";

export function HomePage() {
  const { user, token, logout } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
    logout: state.logout,
  }));

  return (
    <main className="page-container">
      <div className="card">
        <h1>HMS Test Client</h1>
        <p>Use this page to test authentication and API connectivity.</p>

        {token ? (
          <>
            <div className="info-block">
              <strong>Logged in as:</strong> {user?.username || user?.email}
            </div>
            <div className="info-block">
              <strong>Access token:</strong>
              <code>{token}</code>
            </div>
            <button type="button" className="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <p>Please login first.</p>
        )}
      </div>
    </main>
  );
}
