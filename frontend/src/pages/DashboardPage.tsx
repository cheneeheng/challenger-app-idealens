import { useEffect, useState } from "react";
import { toast } from "sonner";

import AppHeader from "../components/AppHeader";
import NewAnalysisModal from "../components/NewAnalysisModal";
import SessionCard from "../components/SessionCard";
import SessionCardSkeleton from "../components/SessionCardSkeleton";
import { getApiErrorMessage } from "../lib/errors";
import type { SessionSummary } from "../lib/types";
import { useSessionStore } from "../stores/sessionStore";

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "1rem",
  marginTop: "1rem",
};

export default function DashboardPage() {
  const sessions = useSessionStore((s) => s.sessions);
  const isLoading = useSessionStore((s) => s.isLoading);
  const hasMore = useSessionStore((s) => s.hasMore);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const removeSessionLocal = useSessionStore((s) => s.removeSessionLocal);
  const restoreSession = useSessionStore((s) => s.restoreSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSessions(1).catch((err) => toast.error(getApiErrorMessage(err)));
  }, [fetchSessions]);

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchSessions(next).catch((err) => toast.error(getApiErrorMessage(err)));
  }

  function handleDelete(session: SessionSummary) {
    // Optimistically drop the card; commit the real delete only if the 5s
    // undo window elapses without the user clicking Undo.
    removeSessionLocal(session.id);
    let undone = false;
    const timer = setTimeout(() => {
      if (undone) return;
      deleteSession(session.id).catch((err) => toast.error(getApiErrorMessage(err)));
    }, 5000);

    toast("Session deleted.", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          restoreSession(session.id).catch((err) => toast.error(getApiErrorMessage(err)));
        },
      },
    });
  }

  const showSkeletons = isLoading && sessions.length === 0;

  return (
    <div>
      <AppHeader />
      <main style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Your analyses</h1>
          <button onClick={() => setModalOpen(true)}>New Analysis</button>
        </div>
        {showSkeletons ? (
          <div style={gridStyle}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p style={{ color: "#888" }}>No analyses yet. Create one to get started.</p>
        ) : (
          <>
            <div style={gridStyle}>
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} onDelete={() => handleDelete(s)} />
              ))}
            </div>
            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
                <button onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <NewAnalysisModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
