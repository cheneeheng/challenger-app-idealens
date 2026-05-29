import AppHeader from "../components/AppHeader";

// Profile, API key, password, and danger zone. Forms wired in a later iteration.
export default function SettingsPage() {
  return (
    <div>
      <AppHeader />
      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 560 }}>
        <section>
          <h2>Profile</h2>
          <p style={{ color: "#888" }}>Update your email.</p>
        </section>
        <section>
          <h2>Anthropic API key</h2>
          <p style={{ color: "#888" }}>Save your key to enable analyses.</p>
        </section>
        <section>
          <h2>Password</h2>
          <p style={{ color: "#888" }}>Change your password.</p>
        </section>
        <section>
          <h2>Danger zone</h2>
          <p style={{ color: "#888" }}>Delete your account and all data.</p>
        </section>
      </main>
    </div>
  );
}
