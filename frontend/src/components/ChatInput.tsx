import { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem", borderTop: "1px solid #ddd" }}>
      <input
        style={{ flex: 1, padding: "0.5rem" }}
        value={text}
        placeholder="Describe your idea..."
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button onClick={submit} disabled={disabled}>
        Send
      </button>
    </div>
  );
}
