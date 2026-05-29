import { useState } from "react";

import AppHeader from "../components/AppHeader";
import NewAnalysisModal from "../components/NewAnalysisModal";
import SessionCard from "../components/SessionCard";
import { useSessionStore } from "../stores/sessionStore";

export default function DashboardPage() {
  const sessions = useSessionStore((s) => s.sessions);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <AppHeader />
      <main style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Your analyses</h1>
          <button onClick={() => setModalOpen(true)}>New Analysis</button>
        </div>
        {sessions.length === 0 ? (
          <p style={{ color: "#888" }}>No analyses yet. Create one to get started.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </main>
      <NewAnalysisModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
