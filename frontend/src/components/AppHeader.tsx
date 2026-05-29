import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { User } from "../lib/types";
import { useAuthStore } from "../stores/authStore";

interface AppHeaderProps {
  sessionName?: string;
  onRename?: (name: string) => void;
}

function initials(user: User): string {
  const source = user.display_name?.trim() || user.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || source[0] || "?").toUpperCase();
}

export default function AppHeader({ sessionName, onRename }: AppHeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sessionName ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the avatar dropdown on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

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
        {user && (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #ddd",
                background: "#eef2ff",
                color: "#4338ca",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {initials(user)}
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  minWidth: 200,
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  padding: "0.5rem 0",
                  zIndex: 20,
                }}
              >
                <div style={{ padding: "0.4rem 0.9rem", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600 }}>{user.display_name ?? "Account"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>{user.email}</div>
                </div>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: "block", padding: "0.5rem 0.9rem", textDecoration: "none", color: "inherit" }}
                >
                  Settings
                </Link>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem 0.9rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "crimson",
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
