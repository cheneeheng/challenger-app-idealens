import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppHeader from "../components/AppHeader";
import { api } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [apiKey, setApiKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await api.patch("/api/users/me", { email, display_name: displayName });
      await fetchMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function saveApiKey(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put("/api/users/me/api-key", { api_key: apiKey });
      setApiKey("");
      await fetchMe();
      toast.success("API key saved");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      await api.patch("/api/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function deleteAccount() {
    try {
      await api.delete("/api/users/me", { data: { password: deletePassword } });
      await logout();
      navigate("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const inputStyle = { display: "block", marginBottom: "0.5rem", width: "100%" } as const;

  return (
    <div>
      <AppHeader />
      <main
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          maxWidth: 560,
        }}
      >
        <form onSubmit={saveProfile}>
          <h2>Profile</h2>
          <input
            style={inputStyle}
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Save profile</button>
        </form>

        <form onSubmit={saveApiKey}>
          <h2>Anthropic API key</h2>
          <input
            style={inputStyle}
            type="password"
            placeholder={user?.has_api_key ? "Key saved — enter a new one to replace" : "sk-ant-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button type="submit">Save</button>
        </form>

        <form onSubmit={changePassword}>
          <h2>Password</h2>
          <input
            style={inputStyle}
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit">Change password</button>
        </form>

        <section>
          <h2>Danger zone</h2>
          <button onClick={() => setDeleteOpen(true)} style={{ color: "crimson" }}>
            Delete account
          </button>
        </section>
      </main>

      {deleteOpen && (
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
          onClick={() => setDeleteOpen(false)}
        >
          <div
            style={{ background: "#fff", padding: "1.5rem", borderRadius: 8, minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete account</h3>
            <p style={{ color: "#888" }}>This permanently deletes your account and all data.</p>
            <input
              style={inputStyle}
              type="password"
              placeholder="Confirm your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button onClick={deleteAccount} style={{ color: "crimson" }} disabled={!deletePassword}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
