---
artifact: ITER_04
status: ready
created: 2026-05-23
scope: Workspace and chat — session page, split layout, chat panel with SSE streaming, model selector, new analysis modal, dashboard session list
sections_changed: [03, 05]
sections_unchanged: [01, 02, 03, 04, 06]
---

# ITER_04 — Workspace + Chat

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

## §03 · Tech Stack

One new dependency:

| Package | Purpose |
|---|---|
| `react-resizable-panels` | drag-to-resize split layout |

## §04 · Backend
> Unchanged — see ITER_02.md §04

---

## §05 · Frontend

### 1. Session Store (`src/stores/sessionStore.ts`)

Expand the stub from ITER_03:

```typescript
interface SessionState {
  sessions: SessionSummary[];
  currentSession: SessionDetail | null;
  isLoading: boolean;

  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  createSession: (idea: string, model: string) => Promise<SessionDetail>;
  updateSession: (id: string, patch: { name?: string; model?: string }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveGraph: (id: string, graphState: GraphState) => void;  // debounced 1s
}
```

`saveGraph` debounces `PUT /api/sessions/:id/graph` by 1 second. Cancel pending debounce on unmount.

### 2. Chat Store (`src/stores/chatStore.ts`)

```typescript
interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;      // accumulates tokens for the in-progress message bubble

  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  appendToken: (text: string) => void;
  finalizeStreamingMessage: () => void;  // move streamingContent into messages array
  loadMessages: (msgs: ChatMessage[]) => void;
  reset: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}
```

### 3. Graph Store Stub (`src/stores/graphStore.ts`)

A minimal stub is needed in this iteration so that `sendMessage()` can call `graphStore.toPayload()`. The full implementation is in ITER_05.

```typescript
interface GraphState {
  nodes: never[];
  edges: never[];
}

interface GraphStore extends GraphState {
  applyGraphActions: (actions: unknown[]) => void;   // no-op
  toPayload: () => { nodes: []; edges: [] };          // returns empty snapshot
}

export const useGraphStore = create<GraphStore>(() => ({
  nodes: [],
  edges: [],
  applyGraphActions: () => {},
  toPayload: () => ({ nodes: [], edges: [] }),
}));
```

ITER_05 replaces this file entirely with the full implementation.

### 4. SSE Client (`src/services/chatService.ts`)

> **Gotcha — SSE with POST + auth headers:** The browser's native `EventSource` only supports GET and cannot send custom headers. Use `fetch()` with `ReadableStream` parsing instead.

```typescript
export async function streamChat(
  payload: ChatRequest,
  accessToken: string,
  callbacks: {
    onToken: (text: string) => void;
    onGraphAction: (action: GraphAction) => void;
    onError: (msg: string) => void;
    onDone: () => void;
  }
): Promise<void> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // parse SSE lines from buffer, dispatch to callbacks
  }
}
```

Parse SSE lines from the buffer: split on `\n\n` (event boundaries), extract `event:` and `data:` lines, dispatch to the appropriate callback.

### 5. New Analysis Modal

A modal rendered inside `DashboardPage`. State: `isOpen`, `idea: string`, `selectedModel: string`.

On submit:
1. Call `sessionStore.createSession(idea, model)` → returns new session
2. Navigate to `/session/<new-session-id>`
3. The `SessionPage` auto-sends the idea on mount (see §6 below)

The model selector is a `<select>` element populated by `GET /api/models`. Fetch once on mount and cache in local state.

### 6. Dashboard Session List

On `DashboardPage` mount call `sessionStore.fetchSessions()`. Render a grid of `SessionCard` components.

**SessionCard** props: `{ session: SessionSummary; onDelete: () => void }`.

Shows: session name, idea excerpt (truncated to ~80 chars), model badge, relative timestamp (`updated_at`). Hover reveals a Delete button. Click the card → navigate to `/session/:id`.

### 7. Session Page (`src/pages/SessionPage.tsx`)

On mount:
1. Call `sessionStore.fetchSession(id)` — loads session + messages + graph state
2. Call `chatStore.loadMessages(session.messages)`
3. If `session.messages.length === 0` (new session), auto-send the idea:
   - Call `chatStore.setStreaming(true)` immediately
   - Call `streamChat({ session_id, message: session.idea, model, graph_state: {} })`

> **Gotcha — React StrictMode double-invocation:** In dev, `useEffect` runs twice. Guard the auto-send with a `useRef(false)` flag set to `true` on first invocation so the idea is sent exactly once.

```typescript
const initialSentRef = useRef(false);
useEffect(() => {
  if (session && session.messages.length === 0 && !initialSentRef.current) {
    initialSentRef.current = true;
    sendMessage(session.idea);
  }
}, [session]);
```

### 8. Split Layout (`src/components/SplitLayout.tsx`)

Use `react-resizable-panels`:

```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={40} minSize={25}>
    <ChatPanel />
  </Panel>
  <PanelResizeHandle />
  <Panel minSize={25}>
    <GraphPanel />     {/* stub in this iteration — see ITER_05 */}
  </Panel>
</PanelGroup>
```

`GraphPanel` renders a placeholder ("Graph coming in ITER_05") at this stage.

### 9. Chat Panel (`src/components/ChatPanel.tsx`)

Layout: scrollable message list + fixed-bottom input bar.

Auto-scroll: `useEffect` with a ref on the message list bottom element — scroll into view whenever `messages` or `streamingContent` changes.

**MessageBubble** — user messages right-aligned, assistant left-aligned, system messages centered in italic muted style.

For the in-progress assistant message: render `streamingContent` as a live bubble with a blinking cursor while `isStreaming` is true. When `finalizeStreamingMessage()` is called, the bubble transitions from live to static.

**ChatInput** — a `<textarea>` that grows vertically (CSS: `resize: none; overflow-y: auto`). Send on button click. Disable input + button while `isStreaming`. Clear on send.

### 10. Send Message Flow

```typescript
async function sendMessage(text: string) {
  chatStore.addMessage({ id: uuid(), role: "user", content: text });
  chatStore.setStreaming(true);

  await streamChat(
    { session_id, message: text, model: currentSession.selected_model, graph_state: graphStore.toPayload() },
    accessToken,
    {
      onToken: (t) => chatStore.appendToken(t),
      onGraphAction: (a) => graphStore.applyAction(a),  // stub in this iter
      onError: (msg) => toast.error(msg),
      onDone: () => {
        chatStore.finalizeStreamingMessage();
        chatStore.setStreaming(false);
        sessionStore.saveGraph(session_id, graphStore.state);
      },
    }
  );
}
```

`graphStore.applyAction` is a no-op stub in this iteration — wired in ITER_05.

---

## §06 · LLM / Prompts
> Unchanged — see ITER_02.md §06
