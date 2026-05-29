// SSE client for POST /api/chat. The browser's native EventSource only supports
// GET and cannot send auth headers, so we stream the response body via fetch +
// ReadableStream and parse SSE frames manually.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface ChatRequest {
  session_id: string;
  message: string;
  model: string;
  graph_state: { nodes: unknown[]; edges: unknown[] };
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onGraphAction: (action: unknown) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}

// Parse one SSE frame ("event:"/"data:" lines separated by blank line).
function parseFrame(frame: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    // id: lines are ignored by the client.
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

function dispatch(event: string, data: string, callbacks: StreamCallbacks): boolean {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(data);
  } catch {
    return false;
  }
  switch (event) {
    case "token":
      callbacks.onToken(String(parsed.text ?? ""));
      return false;
    case "graph_action":
      callbacks.onGraphAction(parsed);
      return false;
    case "error":
      callbacks.onError(String(parsed.message ?? "Stream error"));
      return false;
    case "done":
      callbacks.onDone();
      return true;
    case "ping":
    default:
      return false;
  }
}

export async function streamChat(
  payload: ChatRequest,
  accessToken: string,
  callbacks: StreamCallbacks
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    callbacks.onError("Network error — could not reach the server.");
    callbacks.onDone();
    return;
  }

  if (!response.ok || !response.body) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // non-JSON error body; keep the generic message
    }
    callbacks.onError(detail);
    callbacks.onDone();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseFrame(frame);
      if (parsed && dispatch(parsed.event, parsed.data, callbacks)) {
        done = true;
        break;
      }
      boundary = buffer.indexOf("\n\n");
    }
  }

  // If the stream closed without an explicit done event, signal completion.
  if (!done) callbacks.onDone();
}
