import { Component, type ErrorInfo, type ReactNode } from "react";
import { FiAlertTriangle, FiHome, FiLogOut, FiRefreshCw } from "react-icons/fi";

import { endSession } from "../services/sessionManager";

type AuthenticatedRouteBoundaryProps = {
  children: ReactNode;
  homePath: string;
  resetKey: string;
};

type AuthenticatedRouteBoundaryState = {
  error: Error | null;
};

export default class AuthenticatedRouteBoundary extends Component<
  AuthenticatedRouteBoundaryProps,
  AuthenticatedRouteBoundaryState
> {
  state: AuthenticatedRouteBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AuthenticatedRouteBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Authenticated workspace failed to render", error, info);
  }

  componentDidUpdate(previousProps: AuthenticatedRouteBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private signOut = () => {
    endSession();
    window.location.assign("/login");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="route-error-page">
        <section className="route-error-card" role="alert">
          <span className="route-error-icon">
            <FiAlertTriangle />
          </span>
          <p className="route-error-kicker">Workspace recovery</p>
          <h1>This workspace could not be displayed.</h1>
          <p>
            Your session is still secure. Retry the page, return to your role home, or sign out safely.
          </p>
          <div className="route-error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              <FiRefreshCw /> Retry page
            </button>
            <button type="button" onClick={() => window.location.assign(this.props.homePath)}>
              <FiHome /> Role home
            </button>
            <button type="button" className="secondary" onClick={this.signOut}>
              <FiLogOut /> Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }
}
