// Placeholder split layout shown while a session loads, before currentSession
// is populated (ITER_07 §05.2). Mirrors the real chat | graph split.
export default function WorkspaceSkeleton() {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {/* Chat column */}
      <div
        style={{
          width: "40%",
          borderRight: "1px solid #ddd",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div className="skeleton" style={{ height: 48, width: "75%" }} />
        <div className="skeleton" style={{ height: 48, width: "60%", alignSelf: "flex-end" }} />
        <div className="skeleton" style={{ height: 48, width: "80%" }} />
        <div style={{ flex: 1 }} />
        <div className="skeleton" style={{ height: 56, width: "100%" }} />
      </div>
      {/* Graph column */}
      <div style={{ flex: 1, padding: "1rem" }}>
        <div className="skeleton" style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
