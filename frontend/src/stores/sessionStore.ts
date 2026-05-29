import { create } from "zustand";

import { api } from "../lib/api";
import type { GraphStatePayload, SessionDetail, SessionSummary } from "../lib/types";

interface SessionState {
  sessions: SessionSummary[];
  currentSession: SessionDetail | null;
  isLoading: boolean;

  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  createSession: (idea: string, model: string) => Promise<SessionDetail>;
  updateSession: (id: string, patch: { name?: string; model?: string }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveGraph: (id: string, graphState: GraphStatePayload) => void; // debounced 1s
  reset: () => void;
}

// Module-level debounce handle for saveGraph. Cleared before rescheduling and
// on reset() (called from SessionPage unmount) so a pending write is cancelled.
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function toSummary(detail: SessionDetail): SessionSummary {
  return {
    id: detail.id,
    name: detail.name,
    idea: detail.idea,
    selected_model: detail.selected_model,
    updated_at: detail.updated_at,
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get("/api/sessions");
      set({ sessions: res.data.items });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSession: async (id) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/api/sessions/${id}`);
      set({ currentSession: res.data as SessionDetail });
    } finally {
      set({ isLoading: false });
    }
  },

  createSession: async (idea, model) => {
    const res = await api.post("/api/sessions", { idea, selected_model: model });
    const detail = res.data as SessionDetail;
    set((state) => ({
      sessions: [toSummary(detail), ...state.sessions],
      currentSession: detail,
    }));
    return detail;
  },

  updateSession: async (id, patch) => {
    const body: { name?: string; selected_model?: string } = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.model !== undefined) body.selected_model = patch.model;
    const res = await api.patch(`/api/sessions/${id}`, body);
    const detail = res.data as SessionDetail;
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? toSummary(detail) : s)),
      currentSession: state.currentSession?.id === id ? detail : state.currentSession,
    }));
  },

  deleteSession: async (id) => {
    await api.delete(`/api/sessions/${id}`);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
    }));
  },

  saveGraph: (id, graphState) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void api.put(`/api/sessions/${id}/graph`, { graph_state: graphState });
    }, 1000);
  },

  reset: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ sessions: [], currentSession: null, isLoading: false });
  },
}));
