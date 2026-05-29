import { useEffect, useRef } from "react";

import { useSendMessage } from "../hooks/useChat";
import { useChatStore } from "../stores/chatStore";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const sendMessage = useSendMessage();

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.75rem",
        }}
      >
        {messages.length === 0 && !isStreaming ? (
          <p style={{ color: "#888" }}>Start by describing your idea below.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {isStreaming && streamingContent && (
          <MessageBubble message={{ role: "assistant", content: streamingContent }} streaming />
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={(text) => void sendMessage(text)} disabled={isStreaming} />
    </div>
  );
}
