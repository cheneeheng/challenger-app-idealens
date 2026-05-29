// Toolbar over the graph (auto-layout, fit view, etc.). Actions wired later.
export default function GraphToolbar() {
  return (
    <div style={{ position: "absolute", top: 8, right: 8, zIndex: 5, display: "flex", gap: "0.5rem" }}>
      <button disabled>Auto-layout</button>
      <button disabled>Fit</button>
    </div>
  );
}
