import { create } from "zustand";

import { api } from "../lib/api";
import { userSchema } from "../lib/schemas";
import type { User } from "../lib/types";

const TOKEN_KEY = "idealens_access_token";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),

  setUser: (user) => set({ user }),

  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    get().setAccessToken(res.data.access_token);
    await get().fetchMe();
  },

  register: async (email, password) => {
    const res = await api.post("/auth/register", { email, password });
    get().setAccessToken(res.data.access_token);
    await get().fetchMe();
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {
      // Ignore network/revocation errors — clear local state regardless.
    }
    get().reset();
  },

  fetchMe: async () => {
    const res = await api.get("/api/users/me");
    set({ user: userSchema.parse(res.data) });
  },

  reset: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
