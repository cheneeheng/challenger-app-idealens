interface NewAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

// Modal for creating a new analysis session. Form wiring lands in a later iteration.
export default function NewAnalysisModal({ open, onClose }: NewAnalysisModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", padding: "1.5rem", borderRadius: 8, minWidth: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>New Analysis</h2>
        <p style={{ color: "#888" }}>Form coming soon.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
