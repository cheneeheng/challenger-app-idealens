import { Link } from "react-router-dom";

import type { SessionSummary } from "../lib/types";

export default function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <Link
      to={`/session/${session.id}`}
      style={{
        display: "block",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: 8,
        textDecoration: "none",
      }}
    >
      <div style={{ fontWeight: 600 }}>{session.name}</div>
      <div style={{ fontSize: "0.8rem", color: "#888" }}>{session.selected_model}</div>
    </Link>
  );
}
