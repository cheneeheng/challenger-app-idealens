import { useCallback } from "react";
import { toast } from "sonner";

import { api } from "../lib/api";
import { streamChat } from "../services/chatService";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { useGraphStore } from "../stores/graphStore";
import { useSessionStore } from "../stores/sessionStore";

// Sends a chat message and streams the assistant response, applying graph
// actions live and persisting the graph snapshot when the stream completes.
export function useSendMessage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useCallback(
    async (text: string) => {
      const session = useSessionStore.getState().currentSession;
      if (!session || !accessToken) return;

      const chat = useChatStore.getState();
      chat.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
      chat.setStreaming(true);

      await streamChat(
        {
          session_id: session.id,
          message: text,
          model: session.selected_model,
          graph_state: useGraphStore.getState().toPayload(),
        },
        accessToken,
        {
          onToken: (t) => useChatStore.getState().appendToken(t),
          onGraphAction: (a) => useGraphStore.getState().applyGraphActions([a]),
          onError: (msg) => toast.error(msg),
          onDone: () => {
            const cs = useChatStore.getState();
            cs.finalizeStreamingMessage();
            cs.setStreaming(false);
            useSessionStore
              .getState()
              .saveGraph(session.id, useGraphStore.getState().toPayload());
          },
        }
      );
    },
    [accessToken]
  );
}

// Pushes a `system` audit message to the chat and persists it via
// POST /api/sessions/:id/messages (no LLM invocation). Used by manual graph
// mutations (edit / add / delete).
export function usePushSystemMessage() {
  return useCallback((content: string) => {
    const session = useSessionStore.getState().currentSession;
    if (!session) return;
    useChatStore.getState().addMessage({ id: crypto.randomUUID(), role: "system", content });
    void api
      .post(`/api/sessions/${session.id}/messages`, { role: "system", content })
      .catch(() => {
        // Audit-trail write is best-effort; failure must not block the UI.
      });
  }, []);
}
