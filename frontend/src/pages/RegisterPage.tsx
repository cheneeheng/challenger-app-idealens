import { Link } from "react-router-dom";

// Registration form. Submit handler wired in a later iteration.
export default function RegisterPage() {
  return (
    <form style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 280 }}>
      <h1>Create account</h1>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Register</button>
      <span>
        Have an account? <Link to="/login">Log in</Link>
      </span>
    </form>
  );
}
