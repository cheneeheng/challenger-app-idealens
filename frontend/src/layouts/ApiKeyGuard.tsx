import { Link, Outlet } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

// Requires the user to have saved an Anthropic API key before reaching the
// dashboard or a session. Renders a full-page prompt otherwise. /settings is
// outside this guard, so a keyless user can still add their key.
export default function ApiKeyGuard() {
  const user = useAuthStore((s) => s.user);

  if (user && !user.has_api_key) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h2>Add your Anthropic API key to get started.</h2>
          <p style={{ color: "#888" }}>
            IdeaLens uses your own key to analyze ideas.
          </p>
          <Link to="/settings">Go to Settings</Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
