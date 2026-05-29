import { create } from "zustand";

import type { ChatMessage } from "../lib/types";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  reset: () => set({ messages: [], isStreaming: false }),
}));
