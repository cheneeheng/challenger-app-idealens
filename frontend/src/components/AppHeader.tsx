import { Link } from "react-router-dom";

export default function AppHeader() {
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
      <Link to="/dashboard" style={{ fontWeight: 700, textDecoration: "none" }}>
        IdeaLens
      </Link>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/settings">Settings</Link>
      </nav>
    </header>
  );
}
