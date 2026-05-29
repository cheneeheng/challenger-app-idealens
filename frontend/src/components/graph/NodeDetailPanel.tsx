import { useEffect, useRef, useState } from "react";

import { usePushSystemMessage } from "../../hooks/useChat";
import type { AnalysisNodeData } from "../../lib/types";
import { useGraphStore } from "../../stores/graphStore";
import { useSessionStore } from "../../stores/sessionStore";
import { nodeRef } from "./nodeLabel";

interface NodeDetailPanelProps {
  nodeId: string;
  onClose: () => void;
}

export default function NodeDetailPanel({ nodeId, onClose }: NodeDetailPanelProps) {
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const pushSystemMessage = usePushSystemMessage();

  const data = node?.data as AnalysisNodeData | undefined;
  const [label, setLabel] = useState(data?.label ?? "");
  const [content, setContent] = useState(data?.content ?? "");
  const [score, setScore] = useState<string>(data?.score != null ? String(data.score) : "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape while the panel is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-resize the content textarea to fit its text.
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [content]);

  if (!node || !data) return null;

  function persist() {
    useSessionStore.getState().saveGraph(
      useSessionStore.getState().currentSession?.id ?? "",
      useGraphStore.getState().toPayload()
    );
  }

  function handleSave() {
    const patch: Partial<AnalysisNodeData> = { label, content };
    if (data!.type === "feasibility") {
      patch.score = score === "" ? null : Number(score);
    }
    updateNode(nodeId, patch);
    persist();
    pushSystemMessage(`[User action: edited node ${nodeRef(data!.type, label)}]`);
    onClose();
  }

  function handleDelete() {
    deleteNode(nodeId);
    persist();
    pushSystemMessage(`[User action: deleted node ${nodeRef(data!.type, data!.label)}]`);
    onClose();
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        background: "#fff",
        borderLeft: "1px solid #ddd",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.08)",
        padding: "1rem",
        zIndex: 6,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, textTransform: "capitalize" }}>{data.type}</h3>
        <button onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <label style={{ display: "block", marginTop: "1rem", fontSize: "0.8rem", color: "#666" }}>
        Label
      </label>
      <input
        style={{ width: "100%", padding: "0.4rem" }}
        maxLength={60}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <label style={{ display: "block", marginTop: "0.75rem", fontSize: "0.8rem", color: "#666" }}>
        Content
      </label>
      <textarea
        ref={contentRef}
        style={{ width: "100%", padding: "0.4rem", resize: "none", overflow: "hidden", fontFamily: "inherit" }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {data.type === "feasibility" && (
        <>
          <label style={{ display: "block", marginTop: "0.75rem", fontSize: "0.8rem", color: "#666" }}>
            Score (0–10)
          </label>
          <input
            type="number"
            min={0}
            max={10}
            style={{ width: "100%", padding: "0.4rem" }}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
        <button onClick={handleSave}>Save</button>
        {confirmingDelete ? (
          <>
            <span style={{ alignSelf: "center", fontSize: "0.85rem" }}>Delete this node?</span>
            <button onClick={handleDelete} style={{ color: "crimson" }}>
              Confirm
            </button>
            <button onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} style={{ color: "crimson" }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
