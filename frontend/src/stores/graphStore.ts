import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";

import type { GraphAction } from "../lib/graphActions";

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  applyAction: (action: GraphAction) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  // Action reducer lands in a later iteration.
  applyAction: (_action) => set((state) => state),
  reset: () => set({ nodes: [], edges: [] }),
}));
