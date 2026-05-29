// Gray animated placeholder shown in place of a SessionCard while the session
// list is loading. Matches the real card's outer dimensions (ITER_07 §05.2).
export default function SessionCardSkeleton() {
  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div className="skeleton" style={{ height: 18, width: "70%" }} />
      <div className="skeleton" style={{ height: 12, width: "100%", marginTop: "0.6rem" }} />
      <div className="skeleton" style={{ height: 12, width: "85%", marginTop: "0.4rem" }} />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <div className="skeleton" style={{ height: 14, width: 56 }} />
        <div className="skeleton" style={{ height: 14, width: 72 }} />
      </div>
    </div>
  );
}
