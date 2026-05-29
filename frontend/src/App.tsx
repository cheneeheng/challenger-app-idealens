import { Navigate, Route, Routes } from "react-router-dom";

import ApiKeyGuard from "./layouts/ApiKeyGuard";
import AuthLayout from "./layouts/AuthLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SessionPage from "./pages/SessionPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<ApiKeyGuard />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
