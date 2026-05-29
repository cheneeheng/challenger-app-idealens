import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0 }}>Something went wrong in the workspace.</h2>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link to="/dashboard">
          <button>Go to Dashboard</button>
        </Link>
        <button onClick={onRetry}>Reload</button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time errors in the session workspace so a thrown exception
// doesn't blank the whole app (ITER_07 §05.3).
export default class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
