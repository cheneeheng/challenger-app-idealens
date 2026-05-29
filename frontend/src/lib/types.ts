import type { DimensionType } from "./graphActions";

// Data carried on each React Flow node. `type` here is the source of truth for
// display logic (the React Flow node.type is used only for nodeTypes lookup).
export interface AnalysisNodeData {
  type: DimensionType;
  label: string;
  content: string;
  score?: number | null;
  userPositioned?: boolean;
  [key: string]: unknown; // React Flow requires node data to be an index signature
}

export interface User {
  id: string;
  email: string;
  display_name?: string | null;
  has_api_key: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  // Assigned by the backend; absent on messages created locally (e.g. the
  // in-progress user/assistant bubbles during streaming).
  message_index?: number;
  created_at?: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  selected_model: string;
  updated_at: string;
}

export interface SessionDetail {
  id: string;
  name: string;
  idea: string;
  selected_model: string;
  graph_state: GraphStatePayload;
  context_summary: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

// Persisted graph snapshot shape (PUT /sessions/:id/graph and SessionDetail).
// Loosely typed because it round-trips through JSONB and may hold either the
// seeded flat root node or React Flow node objects.
export interface GraphStatePayload {
  nodes: unknown[];
  edges: unknown[];
}

export interface ModelOption {
  id: string;
  label: string;
  default: boolean;
}
