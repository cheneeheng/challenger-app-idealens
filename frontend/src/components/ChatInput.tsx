import { useChatStore } from "../stores/chatStore";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem", borderTop: "1px solid #ddd" }}>
      <textarea
        style={{
          flex: 1,
          padding: "0.5rem",
          resize: "none",
          overflowY: "auto",
          maxHeight: 160,
          minHeight: 40,
          fontFamily: "inherit",
          fontSize: "0.9rem",
        }}
        rows={2}
        value={draft}
        placeholder="Describe your idea..."
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button onClick={submit} disabled={disabled || !draft.trim()}>
        Send
      </button>
    </div>
  );
}
