import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send refresh cookie
});

// Attach access token. Token wiring lands with the auth store iteration.
api.interceptors.request.use((config) => {
  return config;
});

// Refresh-on-401 interceptor. Logic lands in a later iteration.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
