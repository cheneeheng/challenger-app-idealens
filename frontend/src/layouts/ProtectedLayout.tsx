import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

// Gates all authenticated routes. Redirects to /login when no token is present.
export default function ProtectedLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
