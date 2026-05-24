---
artifact: ITER_07
status: ready
created: 2026-05-23
scope: Polish and tests — graph animations, loading skeletons, error boundary, rate limiters, pagination, keyboard shortcuts, Vitest unit tests, Playwright E2E
sections_changed: [04, 05]
sections_unchanged: [01, 02, 03, 06]
---

# ITER_07 — Polish + Tests

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

## §03 · Tech Stack

New dependencies:

| Package | Purpose |
|---|---|
| `@playwright/test` | E2E tests (dev) |

---

## §04 · Backend

### 1. Rate Limiters on Routes

`slowapi` is already wired to the app from ITER_01. Apply decorators to individual route handlers. The paths below are the route-local paths (without the router prefix set in `main.py`):

```python
# app/api/routes/auth.py — mounted at /auth
@router.post("/register")
@limiter.limit("5/15minutes")
async def register(...): ...

@router.post("/login")
@limiter.limit("10/15minutes")
async def login(...): ...

# app/api/routes/chat.py — mounted at /api/chat
@router.post("/")
@limiter.limit("30/minute")
async def chat(...): ...

# app/api/routes/sessions.py — mounted at /api/sessions
@router.get("/")
@limiter.limit("60/minute")
async def list_sessions(...): ...
```

Exceeding a limit returns 429. Return a JSON body `{ "detail": "Rate limit exceeded" }` via slowapi's default error handler.

---

## §05 · Frontend

### 1. Graph Node Animations

New nodes animate in with a fade + scale transition. Implement using CSS:

```css
/* Add to AnalysisNode.tsx or a global stylesheet */
@keyframes nodeEnter {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

.analysis-node {
  animation: nodeEnter 250ms ease-out;
}
```

Updated nodes: apply a 2-second highlight pulse via a CSS keyframe on the node wrapper. Trigger by setting a `justUpdated: boolean` flag on the node's data; remove after 2s via `setTimeout`.

After `applyGraphActions` adds new nodes, call `reactFlowInstance.fitView({ duration: 500, padding: 0.1 })` with a 500ms delay:
```typescript
setTimeout(() => reactFlowInstance.fitView({ duration: 500, padding: 0.1 }), 500);
```

### 2. Loading Skeletons

**Dashboard session list:** While `sessionStore.isLoading`, render 4 `SessionCardSkeleton` components (gray animated placeholder cards, same dimensions as real cards). Replace with real cards once loaded.

**Session workspace:** While `sessionStore` is loading the session, render a skeleton split layout — gray placeholder where chat messages would appear, gray placeholder graph area. Replace once `currentSession` is non-null.

Use CSS `@keyframes shimmer` (background-position animation) on the skeleton elements — no library needed.

### 3. Error Boundary

Wrap the session workspace route with a React error boundary:

```tsx
class WorkspaceErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

`ErrorFallback` shows: "Something went wrong in the workspace." + "Go to Dashboard" button + "Reload" button.

### 4. Pagination on Dashboard

Add `page` state to `DashboardPage`. Show "Load more" button at the bottom of the session list. On click: call `sessionStore.fetchSessions(page + 1)` and append results. The API already supports pagination (`page` + `page_size` query params from ITER_01).

Initially load page 1 (20 sessions). Show "Load more" only if the last fetch returned a full page.

### 5. 404 Page

**Replace** the existing catch-all route in `App.tsx` (currently `<Navigate to="/dashboard" />` from ITER_03) with a proper `NotFoundPage`:

```tsx
// Before (ITER_03):
<Route path="*" element={<Navigate to="/dashboard" />} />

// After (this iteration):
<Route path="*" element={<NotFoundPage />} />
```

`NotFoundPage`: "Page not found." + "Go to Dashboard" link. Unauthenticated users who land on an unknown URL now see a clear message instead of being silently bounced to the dashboard (which then redirects to login anyway).

### 6. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Send chat message |
| `Escape` | Close node detail panel / context menu / modals |
| `Cmd/Ctrl + Shift + L` | Fit view (graph) |

Implement in `ChatInput.tsx`:
```typescript
onKeyDown={(e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
}}
```

### 7. User Avatar Dropdown

In `AppHeader`, replace the plain user name with a clickable avatar (initials circle). Click opens a small dropdown:
- Display name + email (non-interactive)
- "Settings" link
- "Logout" button

Use a `useState(isOpen)` + click-outside listener (a `useEffect` that adds a `mousedown` listener on `document`).

### 8. Delete Session with Undo Toast

Replace the immediate delete on dashboard hover with:
1. Remove card from the UI immediately (optimistic)
2. Show a sonner toast: "Session deleted. [Undo]" with a 5-second timeout
3. If Undo is clicked within 5s: re-fetch the session and restore the card
4. If timeout elapses: call `sessionStore.deleteSession(id)` for real

### 9. Vitest Unit Tests

`src/stores/__tests__/graphStore.test.ts`:
- `applyGraphActions` — all 4 action types
- Zod validation skip (malformed action is skipped, store unchanged)
- `userPositioned` flag preserved through layout

`src/services/__tests__/chatService.test.ts`:
- SSE buffer parsing (mock `fetch` + `ReadableStream`)
- `token` event dispatched to `onToken`
- `graph_action` event dispatched to `onGraphAction`
- `error` event dispatched to `onError`

`src/utils/__tests__/graphLayout.test.ts`:
- `computeDagreLayout` returns nodes with positions
- `userPositioned` nodes not repositioned

### 10. Playwright E2E Tests

`e2e/main.spec.ts` — full happy path:

```
1. Register a new account
2. Go to Settings → save an Anthropic API key
3. Return to Dashboard — "API key missing" banner gone
4. Click "New Analysis" → enter an idea → submit
5. Session page loads → auto-send fires → chat streams → graph populates
6. Type a follow-up message → send → graph updates
7. Click a node → NodeDetailPanel opens → edit label → Save
8. Drag a node to a new position
9. Open GraphToolbar → click "Auto Layout" → nodes reposition
10. Go to Settings → Danger Zone → delete account → confirm
11. Redirected to login; session cookie cleared
```

---

## §06 · LLM / Prompts
> Unchanged — see ITER_02.md §06
