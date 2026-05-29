import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import App from "./App";
import "./index.css";
import { useAuthStore } from "./stores/authStore";

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </StrictMode>
  );
}

// Validate any stored token and load the user profile before first render. On
// failure the Axios interceptor attempts a refresh; if that fails the store is
// cleared and ProtectedLayout redirects to /login.
async function bootstrap() {
  if (useAuthStore.getState().accessToken) {
    try {
      await useAuthStore.getState().fetchMe();
    } catch {
      // Interceptor / guards handle the unauthenticated path.
    }
  }
  render();
}

void bootstrap();
