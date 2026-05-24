---
artifact: ITER_05
status: ready
created: 2026-05-23
scope: Graph visualization — React Flow setup, graph Zustand store, applyGraphActions, Dagre auto-layout, custom node components per dimension type
sections_changed: [03, 05]
sections_unchanged: [01, 02, 04, 06]
---

# ITER_05 — Graph Visualization

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

---

## §03 · Tech Stack

New dependencies:

| Package | Purpose |
|---|---|
| `@xyflow/react` | React Flow — node graph |
| `dagre` | directed graph auto-layout algorithm |
| `@types/dagre` | types for dagre |

---

## §05 · Frontend

### 1. Graph Store (`src/stores/graphStore.ts`)

Owns the React Flow `nodes` and `edges` arrays. Also exposes `applyGraphActions` which is called from `chatService.ts` on each `graph_action` SSE event.

```typescript
interface GraphState {
  nodes: Node<AnalysisNodeData>[];
  edges: Edge[];
}

interface GraphStore extends GraphState {
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadGraph: (state: GraphState) => void;
  applyGraphActions: (actions: GraphAction[]) => void;
  updateNode: (id: string, patch: Partial<AnalysisNodeData>) => void;
  deleteNode: (id: string) => void;
  setNodePosition: (id: string, position: XYPosition) => void;
  runAutoLayout: () => void;   // updates node positions in store only — does NOT call fitView
  toPayload: () => GraphState; // snapshot for API calls
}
```

**`applyGraphActions(actions: GraphAction[])`**

Process each action against the current `nodes`/`edges` state:

- `add` → append a new node. Assign position via `getIncrementalPosition(nodes)` (see §3). Validate the action against the Zod schema before applying; skip and log on failure.
- `update` → find node by `id`, merge `label` and `content` fields into `node.data`
- `delete` → remove node and any edges where `source === id || target === id`
- `connect` → append a new edge `{ id: \`e-${source}-${target}\`, source, target, label, type }`

After processing all actions, call `runAutoLayout()` to update node positions in the store. The component calls `reactFlowInstance.fitView()` separately after `applyGraphActions` returns (see §5).

> **Gotcha — `fitView` cannot be called from a Zustand store:** `useReactFlow()` is a React hook and can only be called inside a component. `runAutoLayout()` only updates `nodes` in the store with Dagre-computed positions. The `GraphPanel` component must call `reactFlowInstance.fitView()` in a `useEffect` that watches for node count changes.

**`updateNode(id: string, patch: Partial<AnalysisNodeData>)`**

Finds the node by `id` and shallow-merges `patch` into `node.data`. Used by `NodeDetailPanel` when the user saves edits.

**`deleteNode(id: string)`**

Removes the node with the given `id` and any edges where `source === id || target === id`. Equivalent to processing a single `delete` graph action, but called directly from UI components without going through the full `applyGraphActions` pipeline.

### 2. Auto-Layout (`src/utils/graphLayout.ts`)

Use Dagre to compute a top-down hierarchical layout. Accept the current `nodes` and `edges`, return new `nodes` with computed positions.

```typescript
export function computeDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options = { rankdir: "TB", nodesep: 60, ranksep: 80 }
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph(options);

  nodes.forEach(n => g.setNode(n.id, { width: 200, height: 80 }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map(n => {
    if (n.data.userPositioned) return n;   // preserve user-dragged positions
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - 100, y: y - 40 } };
  });
}
```

`userPositioned: boolean` is a flag stored on `AnalysisNodeData`. Set to `true` in `setNodePosition` (called from `onNodeDragStop`). Dagre skips repositioning nodes where this flag is true.

**`getIncrementalPosition(nodes: Node[]): XYPosition`**

When a new node is added before a layout runs, give it an approximate position offset from its parent or a default offset from the bottom of the graph so it doesn't overlap. Dagre will correct it on the next layout pass.

```typescript
export function getIncrementalPosition(nodes: Node[]): XYPosition {
  if (nodes.length === 0) return { x: 400, y: 100 };
  const maxY = Math.max(...nodes.map(n => n.position.y));
  return { x: 400 + (nodes.length % 3) * 60 - 60, y: maxY + 120 };
}
```

### 3. Graph Zod Schemas (`src/schemas/graph.ts`)

Mirror the backend Pydantic graph schemas in Zod. Use `z.discriminatedUnion("action", [...])` so the discriminator key is `action`, matching the Pydantic structure.

```typescript
const DimensionTypeZ = z.enum([
  "concept", "requirement", "gap", "benefit", "drawback",
  "feasibility", "flaw", "alternative", "question"
]);

const AddActionZ = z.object({
  action: z.literal("add"),
  payload: z.object({
    id: z.string(),
    type: DimensionTypeZ,
    label: z.string().max(60),
    content: z.string(),
    score: z.number().min(0).max(10).nullable(),
    parent_id: z.string().nullable(),
  })
});

const UpdateActionZ = z.object({
  action: z.literal("update"),
  payload: z.object({
    id: z.string(),
    label: z.string().max(60).optional(),
    content: z.string().optional(),
  })
});

const DeleteActionZ = z.object({
  action: z.literal("delete"),
  payload: z.object({ id: z.string() })
});

const ConnectActionZ = z.object({
  action: z.literal("connect"),
  payload: z.object({
    source: z.string(),
    target: z.string(),
    label: z.string(),
    type: z.string(),
  })
});

// z.discriminatedUnion reads `action` first, then validates the matching schema.
// A malformed payload under the correct action will throw ZodError cleanly.
export const GraphActionZ = z.discriminatedUnion("action", [
  AddActionZ, UpdateActionZ, DeleteActionZ, ConnectActionZ
]);

export type GraphAction = z.infer<typeof GraphActionZ>;
```

### 4. AnalysisNode Component (`src/components/graph/AnalysisNode.tsx`)

Custom React Flow node component. Each node has a colored top border indicating its dimension type.

```typescript
interface AnalysisNodeData {
  type: DimensionType;
  label: string;
  content: string;
  score?: number | null;
  userPositioned?: boolean;
}
```

Layout: colored top border (4px) → dimension type badge → bold label → content text. If `type === "feasibility"` and `score != null`, show score as `X/10` with a color indicator (green ≥7, yellow 4–6, red ≤3).

Handles: React Flow renders connection handles on hover. Keep source/target handles visible.

**Color map per dimension:**
```typescript
const DIMENSION_COLORS: Record<DimensionType, string> = {
  concept:     "#6366f1",  // indigo
  requirement: "#0ea5e9",  // sky
  gap:         "#f59e0b",  // amber
  benefit:     "#22c55e",  // green
  drawback:    "#ef4444",  // red
  feasibility: "#8b5cf6",  // violet
  flaw:        "#f97316",  // orange
  alternative: "#14b8a6",  // teal
  question:    "#ec4899",  // pink
};
```

> **Gotcha — stable references for node types:** Define `nodeTypes` at module level, outside the `GraphPanel` component. If defined inside the component, a new object is created on every render, causing React Flow to unmount and remount every node on each state update.

> **Gotcha — node `type` must match `nodeTypes` keys:** React Flow renders a node by looking up `node.type` in the `nodeTypes` map. The backend seeds the root node with `type: "concept"` and the LLM emits all 9 dimension type strings. `nodeTypes` must therefore use those dimension strings as keys — all mapping to the same `AnalysisNode` component:

```typescript
// TOP OF FILE — outside component. All 9 dimension types → same component.
const nodeTypes: NodeTypes = {
  concept:     AnalysisNode,
  requirement: AnalysisNode,
  gap:         AnalysisNode,
  benefit:     AnalysisNode,
  drawback:    AnalysisNode,
  feasibility: AnalysisNode,
  flaw:        AnalysisNode,
  alternative: AnalysisNode,
  question:    AnalysisNode,
};

export function GraphPanel() {
  // use nodeTypes here — it is a stable reference
}
```

Inside `AnalysisNode`, the dimension type is read from `data.type` (not from `node.type` — `data.type` is the source of truth for display logic).

### 5. Graph Panel (`src/components/GraphPanel.tsx`)

```tsx
import { ReactFlow, Background, MiniMap, Controls,
         useReactFlow, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export function GraphPanel() {
  const { nodes, edges, setNodes, setEdges, setNodePosition } = useGraphStore();
  const { fitView } = useReactFlow();

  // After nodes are added by applyGraphActions, fit the view with a short delay
  // so the new node positions have been committed to the DOM first.
  const prevNodeCount = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > prevNodeCount.current) {
      setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 500);
    }
    prevNodeCount.current = nodes.length;
  }, [nodes.length, fitView]);

  const onNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges]
  );
  const onNodeDragStop = useCallback(
    (_, node) => setNodePosition(node.id, node.position),
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}      // module-level stable reference
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      fitView
    >
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}
```

`GraphPanel` must be rendered inside a `<ReactFlowProvider>` so that `useReactFlow()` has access to the flow instance. Wrap it in `SessionPage`:

```tsx
// SessionPage.tsx
import { ReactFlowProvider } from "@xyflow/react";

<ReactFlowProvider>
  <GraphPanel />
</ReactFlowProvider>
```

**Auto Layout from toolbar** (introduced in ITER_06): the `GraphToolbar` also needs `fitView`. Since it renders inside `GraphPanel`'s subtree (inside `ReactFlowProvider`), it can call `useReactFlow().fitView()` directly after invoking `graphStore.runAutoLayout()`.

### 6. Wiring applyGraphActions into the Chat Flow

Update `chatService.ts` callback from ITER_04:
```typescript
onGraphAction: (action) => graphStore.applyGraphActions([action]),
```

Each `graph_action` SSE event triggers one action immediately. This gives the user a live experience of nodes appearing as the LLM streams.

### 7. Loading the Graph on Session Mount

In `SessionPage.tsx`, after `sessionStore.fetchSession()` resolves:
```typescript
graphStore.loadGraph(currentSession.graph_state);
```

`loadGraph` replaces the entire nodes + edges state and resets `userPositioned` flags. It does NOT run auto-layout — the persisted positions are used as-is. Auto-layout is user-triggered (added in ITER_06).

---

## §04 · Backend
> Unchanged — see ITER_02.md §04

## §06 · LLM / Prompts
> Unchanged — see ITER_02.md §06
