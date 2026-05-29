import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { relativeTime } from "../lib/time";
import type { SessionSummary } from "../lib/types";

interface SessionCardProps {
  session: SessionSummary;
  onDelete: () => void;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={() => navigate(`/session/${session.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: 8,
        cursor: "pointer",
        background: hover ? "#fafafa" : "#fff",
      }}
    >
      <div style={{ fontWeight: 600, marginRight: "1.5rem" }}>{session.name}</div>
      <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.4rem", marginBottom: 0 }}>
        {session.idea.length > 80 ? `${session.idea.slice(0, 80)}…` : session.idea}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            background: "#eef2ff",
            color: "#4338ca",
            padding: "0.1rem 0.4rem",
            borderRadius: 4,
          }}
        >
          {session.selected_model}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#888" }}>{relativeTime(session.updated_at)}</span>
      </div>
      {hover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: "0.75rem",
            color: "crimson",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}
