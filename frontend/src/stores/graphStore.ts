import type { Edge, Node, XYPosition } from "@xyflow/react";
import { create } from "zustand";

import { graphAction, type GraphAction } from "../lib/graphActions";
import type { AnalysisNodeData, GraphStatePayload } from "../lib/types";
import { computeDagreLayout, getIncrementalPosition } from "../utils/graphLayout";

type AnalysisNode = Node<AnalysisNodeData>;

interface GraphState {
  nodes: AnalysisNode[];
  edges: Edge[];
}

interface GraphStore extends GraphState {
  setNodes: (nodes: AnalysisNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadGraph: (state: GraphStatePayload) => void;
  applyGraphActions: (actions: unknown[]) => void;
  updateNode: (id: string, patch: Partial<AnalysisNodeData>) => void;
  deleteNode: (id: string) => void;
  setNodePosition: (id: string, position: XYPosition) => void;
  runAutoLayout: () => void;
  toPayload: () => GraphState;
  reset: () => void;
}

// Normalize a persisted/seeded node (which may be a flat seed node or a stored
// React Flow node) into a React Flow node with fresh userPositioned flags.
function normalizeNode(raw: unknown): AnalysisNode {
  const n = raw as Record<string, unknown>;
  const data = n.data as Partial<AnalysisNodeData> | undefined;
  const type = (data?.type ?? n.type ?? "concept") as AnalysisNodeData["type"];
  const position = (n.position as XYPosition | undefined) ?? { x: 0, y: 0 };
  return {
    id: String(n.id),
    type,
    position,
    data: {
      type,
      label: String(data?.label ?? n.label ?? ""),
      content: String(data?.content ?? n.content ?? ""),
      score: (data?.score ?? (n.score as number | null | undefined)) ?? null,
      userPositioned: false,
    },
  };
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  loadGraph: (state) =>
    set({
      nodes: (state.nodes ?? []).map(normalizeNode),
      edges: (state.edges ?? []) as Edge[],
    }),

  applyGraphActions: (actions) => {
    let nodes = [...get().nodes];
    let edges = [...get().edges];

    for (const raw of actions) {
      const parsed = graphAction.safeParse(raw);
      if (!parsed.success) {
        console.warn("Skipping invalid graph action", parsed.error.issues, raw);
        continue;
      }
      const action: GraphAction = parsed.data;

      switch (action.action) {
        case "add": {
          const p = action.payload;
          nodes = [
            ...nodes,
            {
              id: p.id,
              type: p.type,
              position: getIncrementalPosition(nodes),
              data: {
                type: p.type,
                label: p.label,
                content: p.content,
                score: p.score,
                userPositioned: false,
              },
            },
          ];
          break;
        }
        case "update": {
          const p = action.payload;
          nodes = nodes.map((n) =>
            n.id === p.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    ...(p.label != null ? { label: p.label } : {}),
                    ...(p.content != null ? { content: p.content } : {}),
                  },
                }
              : n
          );
          break;
        }
        case "delete": {
          const id = action.payload.id;
          nodes = nodes.filter((n) => n.id !== id);
          edges = edges.filter((e) => e.source !== id && e.target !== id);
          break;
        }
        case "connect": {
          const p = action.payload;
          edges = [
            ...edges,
            { id: `e-${p.source}-${p.target}`, source: p.source, target: p.target, label: p.label, type: p.type },
          ];
          break;
        }
      }
    }

    set({ nodes: computeDagreLayout(nodes, edges), edges });
  },

  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  setNodePosition: (id, position) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position, data: { ...n.data, userPositioned: true } } : n
      ),
    })),

  runAutoLayout: () =>
    set((state) => ({ nodes: computeDagreLayout(state.nodes, state.edges) })),

  toPayload: () => ({ nodes: get().nodes, edges: get().edges }),

  reset: () => set({ nodes: [], edges: [] }),
}));
