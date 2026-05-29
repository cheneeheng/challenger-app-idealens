import type { ChatMessage } from "../lib/types";

interface MessageBubbleProps {
  message: Pick<ChatMessage, "role" | "content">;
  streaming?: boolean; // render a blinking cursor for the in-progress bubble
}

export default function MessageBubble({ message, streaming }: MessageBubbleProps) {
  if (message.role === "system") {
    return (
      <div
        style={{
          alignSelf: "center",
          maxWidth: "90%",
          fontStyle: "italic",
          fontSize: "0.8rem",
          color: "#888",
          textAlign: "center",
          padding: "0.25rem 0",
        }}
      >
        {message.content}
      </div>
    );
  }

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
        whiteSpace: "pre-wrap",
      }}
    >
      {message.content}
      {streaming && <span className="blinking-cursor">▋</span>}
    </div>
  );
}
