import { useEffect } from "react";

import { usePushSystemMessage } from "../../hooks/useChat";
import type { AnalysisNodeData } from "../../lib/types";
import { useChatStore } from "../../stores/chatStore";
import { useGraphStore } from "../../stores/graphStore";
import { useSessionStore } from "../../stores/sessionStore";
import { nodeRef } from "./nodeLabel";

export interface ContextMenuState {
  nodeId: string;
  top: number;
  left: number;
}

interface NodeContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onEdit: (nodeId: string) => void;
}

export default function NodeContextMenu({ menu, onClose, onEdit }: NodeContextMenuProps) {
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === menu.nodeId));
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const setDraft = useChatStore((s) => s.setDraft);
  const pushSystemMessage = usePushSystemMessage();

  // Dismiss on outside click or Escape.
  useEffect(() => {
    const onDown = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("click", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!node) return null;
  const data = node.data as AnalysisNodeData;

  function handleDelete() {
    deleteNode(menu.nodeId);
    useSessionStore
      .getState()
      .saveGraph(useSessionStore.getState().currentSession?.id ?? "", useGraphStore.getState().toPayload());
    pushSystemMessage(`[User action: deleted node ${nodeRef(data.type, data.label)}]`);
    onClose();
  }

  function handleAsk() {
    setDraft(`Tell me more about: ${data.label}`);
    onClose();
  }

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "0.4rem 0.75rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.85rem",
  };

  return (
    <div
      className="context-menu"
      style={{
        position: "fixed",
        top: menu.top,
        left: menu.left,
        zIndex: 10,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        minWidth: 180,
        padding: "0.25rem 0",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button style={itemStyle} onClick={() => onEdit(menu.nodeId)}>
        Edit
      </button>
      <button style={{ ...itemStyle, color: "crimson" }} onClick={handleDelete}>
        Delete
      </button>
      <button style={itemStyle} onClick={handleAsk}>
        Ask Claude about this
      </button>
    </div>
  );
}
