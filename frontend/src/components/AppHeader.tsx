import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

interface AppHeaderProps {
  sessionName?: string;
  onRename?: (name: string) => void;
}

export default function AppHeader({ sessionName, onRename }: AppHeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sessionName ?? "");

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function commitRename() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== sessionName) {
      onRename?.(next);
    }
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid #ddd",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link to="/dashboard" style={{ fontWeight: 700, textDecoration: "none" }}>
          IdeaLens
        </Link>
        {sessionName !== undefined &&
          (editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <span
              onDoubleClick={() => {
                setDraft(sessionName);
                setEditing(true);
              }}
              title="Double-click to rename"
              style={{ color: "#444" }}
            >
              {sessionName}
            </span>
          ))}
      </div>
      <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {user && <span style={{ color: "#888" }}>{user.display_name ?? user.email}</span>}
        <Link to="/settings">Settings</Link>
        <button onClick={handleLogout}>Logout</button>
      </nav>
    </header>
  );
}
