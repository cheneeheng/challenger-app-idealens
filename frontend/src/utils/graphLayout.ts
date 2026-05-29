import type { Edge, Node, XYPosition } from "@xyflow/react";
import dagre from "dagre";

import type { AnalysisNodeData } from "../lib/types";

type AnalysisNode = Node<AnalysisNodeData>;

interface LayoutOptions {
  rankdir: string;
  nodesep: number;
  ranksep: number;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

// Top-down hierarchical layout via Dagre. Nodes the user has dragged
// (userPositioned) keep their position; everything else is repositioned.
export function computeDagreLayout(
  nodes: AnalysisNode[],
  edges: Edge[],
  options: LayoutOptions = { rankdir: "TB", nodesep: 60, ranksep: 80 }
): AnalysisNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph(options);

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    if (n.data.userPositioned) return n;
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
  });
}

// Approximate position for a freshly added node, offset below the current graph
// so it does not overlap. Dagre corrects it on the next layout pass.
export function getIncrementalPosition(nodes: AnalysisNode[]): XYPosition {
  if (nodes.length === 0) return { x: 400, y: 100 };
  const maxY = Math.max(...nodes.map((n) => n.position.y));
  return { x: 400 + (nodes.length % 3) * 60 - 60, y: maxY + 120 };
}
