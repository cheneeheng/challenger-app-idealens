---
artifact: ITER_06
status: ready
created: 2026-05-23
scope: Graph interactions — node detail panel, graph toolbar, context menu, graph-to-chat feedback loop, inline session rename
sections_changed: [04, 05]
sections_unchanged: [01, 02, 03, 06]
---

# ITER_06 — Graph Interactions

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

## §03 · Tech Stack
> Unchanged — see ITER_05.md §03

## §04 · Backend

### New Endpoint: `POST /api/sessions/:id/messages`

Accepts `{ role: "system", content: str }`. Persists a single `Message` record without any LLM invocation — this is a pure audit-trail write for user-initiated graph mutations.

Assign `message_index` via `SELECT COALESCE(MAX(message_index), -1) + 1` inside a transaction. Return the saved message as `MessageResponse`.

Auth: requires `get_current_user`. Returns 403 if the session doesn't belong to the current user.

---

## §05 · Frontend

### 1. Node Detail Panel (`src/components/graph/NodeDetailPanel.tsx`)

A slide-over panel that opens when the user clicks a node. Fixed width (360px), slides in from the right side of `GraphPanel`.

**Trigger:** `onNodeClick` handler on `<ReactFlow>` → set `selectedNodeId` in local `GraphPanel` state.

**Fields rendered:**
- `label` — single-line text input (max 60 chars)
- `content` — `<textarea>` (auto-resize)
- `score` — number input 0–10, only shown when `node.data.type === "feasibility"`

**Actions:**
- **Save** → `graphStore.updateNode(id, { label, content, score })` + `sessionStore.saveGraph()` + push system message to `chatStore` (see §4)
- **Delete** → confirmation step ("Delete this node?") → `graphStore.deleteNode(id)` + close panel + save graph + push system message
- **Close** (✕ button or `Escape` key) → close without saving

Close on `Escape`: add a `keydown` event listener when the panel is open, remove it on close.

### 2. Graph Toolbar (`src/components/graph/GraphToolbar.tsx`)

A floating panel anchored to the top-right corner of `GraphPanel`. Four buttons:

| Button | Action |
|---|---|
| Fit View | `reactFlowInstance.fitView({ duration: 400 })` |
| Auto Layout | re-run `computeDagreLayout` on current nodes/edges; update store; then `fitView` |
| Add Node | open `AddNodeModal` |
| Delete Selected | delete all selected nodes (React Flow exposes selected state via `useStore`) |

**`AddNodeModal`** — a small modal with:
- Dimension type selector (`<select>` with all 9 types)
- Label input
- Content textarea
- On save: `graphStore.applyGraphActions([{ action: "add", payload: { id: nanoid(), type, label, content, score: null, parent_id: null } }])` + save graph + push system message

### 3. Node Context Menu (`src/components/graph/NodeContextMenu.tsx`)

Trigger: `onNodeContextMenu` on `<ReactFlow>`. Show a small absolute-positioned menu at cursor position.

Items:
- **Edit** → open `NodeDetailPanel` for this node
- **Delete** → same delete flow as the panel
- **Ask Claude about this** → pre-fill `ChatInput` with: `Tell me more about: [node.label]`

Dismiss: click anywhere outside, or press `Escape`.

**Positioning:** The context menu is a DOM overlay (not a React Flow canvas element), so position it using screen coordinates directly from the browser event. Do not use `reactFlowInstance.screenToFlowPosition()` — that converts to canvas coordinates, which are useless for CSS `top`/`left` on a DOM element.

```typescript
const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
  event.preventDefault();
  setMenu({
    nodeId: node.id,
    top: event.clientY,
    left: event.clientX,
  });
}, []);
```

```tsx
{menu && (
  <div
    className="context-menu"
    style={{ position: "fixed", top: menu.top, left: menu.left, zIndex: 10 }}
  >
    ...menu items...
  </div>
)}
```

Use `position: fixed` (not `absolute`) so the menu stays at the cursor regardless of scroll.

### 4. Graph → Chat Feedback (`src/stores/chatStore.ts`)

When the user makes a manual graph mutation (edit, add, or delete via the UI), push a `system` role message to `chatStore` and persist it to the DB.

Format:
```
[User action: edited node "Benefits › Faster delivery"]
[User action: added node "Requirement › Legal compliance"]
[User action: deleted node "Flaw › Unclear target market"]
```

System messages are displayed in the chat as centered italic muted text (already handled by `MessageBubble` from ITER_04 — `role === "system"` renders as italic muted).

To persist: call `POST /api/sessions/:id/messages` — **wait**, there is no separate messages endpoint. Instead, send a system message through the chat endpoint would require LLM invocation. The correct approach: persist system messages directly by extending the backend.

**Backend addition (small):** Add `POST /api/sessions/:id/messages` endpoint:
```python
# Accepts: { role: "system", content: str }
# Creates a Message record; returns the saved message
```

This endpoint does not go through the LLM — it is purely a persistence call for user-action audit trail messages.

### 5. Inline Session Rename (`src/components/AppHeader.tsx`)

The session name in `AppHeader` is double-clickable. On double-click: replace the static text with an `<input>` element pre-filled with the current name.

On blur or `Enter`: call `sessionStore.updateSession(id, { name: newName })` → `PATCH /api/sessions/:id`. On `Escape`: cancel and revert.

### 6. Drag-to-Reposition (already partial from ITER_05)

`setNodePosition` already marks `userPositioned: true`. No new code needed. Verify that `computeDagreLayout` respects the flag correctly (skips repositioning nodes where `userPositioned === true`).

---

## §06 · LLM / Prompts
> Unchanged — see ITER_02.md §06
