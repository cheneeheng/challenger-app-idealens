import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import type { ModelOption } from "../lib/types";
import { useSessionStore } from "../stores/sessionStore";

interface NewAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewAnalysisModal({ open, onClose }: NewAnalysisModalProps) {
  const navigate = useNavigate();
  const createSession = useSessionStore((s) => s.createSession);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [idea, setIdea] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch the model list once on mount and cache it in local state.
  useEffect(() => {
    let active = true;
    api
      .get("/api/models")
      .then((res) => {
        if (!active) return;
        const list = res.data as ModelOption[];
        setModels(list);
        setSelectedModel(list.find((m) => m.default)?.id ?? list[0]?.id ?? "");
      })
      .catch((err) => toast.error(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  // Close on Escape while open (ITER_07 §05.6).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    const trimmed = idea.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const session = await createSession(trimmed, selectedModel);
      onClose();
      setIdea("");
      navigate(`/session/${session.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", padding: "1.5rem", borderRadius: 8, minWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>New Analysis</h2>
        <label style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Your idea</label>
        <textarea
          autoFocus
          style={{ width: "100%", padding: "0.5rem", fontFamily: "inherit", marginBottom: "0.75rem" }}
          rows={4}
          placeholder="Describe the idea you want to analyze..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <label style={{ display: "block", fontSize: "0.8rem", color: "#666" }}>Model</label>
        <select
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={!idea.trim() || submitting}>
            {submitting ? "Creating..." : "Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}
