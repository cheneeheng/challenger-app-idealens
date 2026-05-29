import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

// Wraps the login/register pages. Redirects authenticated users to the dashboard.
export default function AuthLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <Outlet />
    </div>
  );
}
