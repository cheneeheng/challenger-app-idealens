export interface User {
  id: string;
  email: string;
  has_api_key: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  message_index: number;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  selected_model: string;
  updated_at: string;
}

export interface ModelOption {
  id: string;
  label: string;
  default: boolean;
}
