import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

// Requires the user to have saved an Anthropic API key before reaching
// the dashboard or a session. Redirects to /settings otherwise.
export default function ApiKeyGuard() {
  const user = useAuthStore((s) => s.user);

  if (user && !user.has_api_key) {
    return <Navigate to="/settings" replace />;
  }

  return <Outlet />;
}
