import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import AppHeader from "../components/AppHeader";
import ChatPanel from "../components/ChatPanel";
import GraphPanel from "../components/GraphPanel";
import SplitLayout from "../components/SplitLayout";
import { useSendMessage } from "../hooks/useChat";
import { getApiErrorMessage } from "../lib/errors";
import { useChatStore } from "../stores/chatStore";
import { useGraphStore } from "../stores/graphStore";
import { useSessionStore } from "../stores/sessionStore";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const currentSession = useSessionStore((s) => s.currentSession);
  const fetchSession = useSessionStore((s) => s.fetchSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const sendMessage = useSendMessage();

  const initialSentRef = useRef(false);

  // Load session + messages + graph on mount / id change.
  useEffect(() => {
    if (!id) return;
    initialSentRef.current = false;
    (async () => {
      try {
        await fetchSession(id);
        const session = useSessionStore.getState().currentSession;
        if (!session) return;
        useChatStore.getState().loadMessages(session.messages);
        useGraphStore.getState().loadGraph(session.graph_state);
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      }
    })();

    return () => {
      // Cancel any pending graph save and clear per-session state on unmount.
      useSessionStore.getState().reset();
      useChatStore.getState().reset();
      useGraphStore.getState().reset();
    };
  }, [id, fetchSession]);

  // Auto-send the idea exactly once for a brand-new session. The useRef guard
  // survives React StrictMode's double-invoked effect in development.
  useEffect(() => {
    if (
      currentSession &&
      currentSession.messages.length === 0 &&
      !initialSentRef.current
    ) {
      initialSentRef.current = true;
      useChatStore.getState().setStreaming(true);
      void sendMessage(currentSession.idea);
    }
  }, [currentSession, sendMessage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppHeader
        sessionName={currentSession?.name ?? ""}
        onRename={(name) => {
          if (id) void updateSession(id, { name });
        }}
      />
      <SplitLayout
        left={<ChatPanel />}
        right={
          <ReactFlowProvider>
            <GraphPanel />
          </ReactFlowProvider>
        }
      />
    </div>
  );
}
