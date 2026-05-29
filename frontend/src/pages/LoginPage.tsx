import { Link } from "react-router-dom";

// Login form. Submit handler wired in a later iteration.
export default function LoginPage() {
  return (
    <form style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 280 }}>
      <h1>Log in</h1>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Log in</button>
      <span>
        No account? <Link to="/register">Register</Link>
      </span>
    </form>
  );
}
