import { useChatStore } from "../stores/chatStore";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem" }}>
        {messages.length === 0 ? (
          <p style={{ color: "#888" }}>Start by describing your idea below.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
      {/* Send handler wired in a later iteration. */}
      <ChatInput onSend={() => {}} disabled={isStreaming} />
    </div>
  );
}
