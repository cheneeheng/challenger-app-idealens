import { create } from "zustand";

import type { ChatMessage } from "../lib/types";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string; // accumulates tokens for the in-progress assistant bubble
  draft: string; // controlled ChatInput value (so other panels can prefill it)

  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  appendToken: (text: string) => void;
  finalizeStreamingMessage: () => void; // move streamingContent into messages
  loadMessages: (msgs: ChatMessage[]) => void;
  setDraft: (text: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  streamingContent: "",
  draft: "",

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  appendToken: (text) =>
    set((state) => ({ streamingContent: state.streamingContent + text })),

  finalizeStreamingMessage: () =>
    set((state) => {
      if (!state.streamingContent) return { streamingContent: "" };
      const finalized: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: state.streamingContent,
      };
      return { messages: [...state.messages, finalized], streamingContent: "" };
    }),

  loadMessages: (messages) => set({ messages }),

  setDraft: (draft) => set({ draft }),

  reset: () => set({ messages: [], isStreaming: false, streamingContent: "", draft: "" }),
}));
