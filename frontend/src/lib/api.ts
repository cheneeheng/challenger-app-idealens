import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
});

// Attach the access token from the auth store on every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single in-flight refresh shared across concurrent 401s so a rotated token
// is not re-used by a second refresh call (which would log the user out).
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isRefreshCall = original?.url?.includes("/auth/refresh");
    if (error.response?.status !== 401 || !original || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      if (!refreshPromise) {
        // The refresh cookie is httpOnly; it is only sent when withCredentials
        // is set on this specific call.
        refreshPromise = api
          .post("/auth/refresh", {}, { withCredentials: true })
          .then((res) => res.data.access_token as string)
          .finally(() => {
            refreshPromise = null;
          });
      }
      const newToken = await refreshPromise;
      useAuthStore.getState().setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().reset();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    }
  }
);
