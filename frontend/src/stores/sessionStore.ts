import { create } from "zustand";

import type { SessionSummary } from "../lib/types";

interface SessionState {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  setSessions: (sessions: SessionSummary[]) => void;
  setCurrentSession: (id: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  currentSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (currentSessionId) => set({ currentSessionId }),
  reset: () => set({ sessions: [], currentSessionId: null }),
}));
