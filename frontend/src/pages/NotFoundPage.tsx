import { Link } from "react-router-dom";

// Catch-all 404 (ITER_07 §05.5). Replaces the old silent redirect to /dashboard
// so an unauthenticated visitor sees a clear message rather than a login bounce.
export default function NotFoundPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0 }}>Page not found.</h1>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
}
