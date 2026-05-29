import type { ChatMessage } from "../lib/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "80%",
        padding: "0.5rem 0.75rem",
        borderRadius: 12,
        background: isUser ? "#2563eb" : "#f1f1f1",
        color: isUser ? "#fff" : "#111",
      }}
    >
      {message.content}
    </div>
  );
}
