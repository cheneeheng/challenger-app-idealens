import { useReactFlow } from "@xyflow/react";
import { useEffect, useState } from "react";

import { usePushSystemMessage } from "../../hooks/useChat";
import { dimensionType, type DimensionType } from "../../lib/graphActions";
import { useGraphStore } from "../../stores/graphStore";
import { useSessionStore } from "../../stores/sessionStore";
import { nodeRef } from "./nodeLabel";

const DIMENSION_TYPES = dimensionType.options;

function saveGraph() {
  useSessionStore
    .getState()
    .saveGraph(useSessionStore.getState().currentSession?.id ?? "", useGraphStore.getState().toPayload());
}

export default function GraphToolbar() {
  const { fitView } = useReactFlow();
  const runAutoLayout = useGraphStore((s) => s.runAutoLayout);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const pushSystemMessage = usePushSystemMessage();
  const [addOpen, setAddOpen] = useState(false);

  function handleAutoLayout() {
    runAutoLayout();
    saveGraph();
    void fitView({ duration: 400 });
  }

  function handleDeleteSelected() {
    const selected = useGraphStore.getState().nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    selected.forEach((n) => {
      deleteNode(n.id);
      pushSystemMessage(`[User action: deleted node ${nodeRef(n.data.type, n.data.label)}]`);
    });
    saveGraph();
  }

  const btn: React.CSSProperties = {
    padding: "0.3rem 0.6rem",
    fontSize: "0.8rem",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 4,
    cursor: "pointer",
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 5,
          display: "flex",
          gap: "0.4rem",
        }}
      >
        <button style={btn} onClick={() => void fitView({ duration: 400 })}>
          Fit View
        </button>
        <button style={btn} onClick={handleAutoLayout}>
          Auto Layout
        </button>
        <button style={btn} onClick={() => setAddOpen(true)}>
          Add Node
        </button>
        <button style={btn} onClick={handleDeleteSelected}>
          Delete Selected
        </button>
      </div>
      {addOpen && <AddNodeModal onClose={() => setAddOpen(false)} onAdded={() => void fitView({ duration: 400 })} />}
    </>
  );
}

function AddNodeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const applyGraphActions = useGraphStore((s) => s.applyGraphActions);
  const pushSystemMessage = usePushSystemMessage();
  const [type, setType] = useState<DimensionType>("concept");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");

  // Close on Escape (ITER_07 §05.6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    if (!label.trim()) return;
    applyGraphActions([
      {
        action: "add",
        payload: { id: crypto.randomUUID(), type, label, content, score: null, parent_id: null },
      },
    ]);
    saveGraph();
    pushSystemMessage(`[User action: added node ${nodeRef(type, label)}]`);
    onAdded();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", padding: "1.5rem", borderRadius: 8, minWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Add node</h3>
        <label style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Type</label>
        <select
          style={{ width: "100%", padding: "0.4rem", marginBottom: "0.5rem" }}
          value={type}
          onChange={(e) => setType(e.target.value as DimensionType)}
        >
          {DIMENSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Label</label>
        <input
          style={{ width: "100%", padding: "0.4rem", marginBottom: "0.5rem" }}
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <label style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Content</label>
        <textarea
          style={{ width: "100%", padding: "0.4rem", fontFamily: "inherit" }}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button onClick={handleSave} disabled={!label.trim()}>
            Add
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
