import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisNodeData } from "../lib/types";
import { useGraphStore } from "../stores/graphStore";
import AnalysisNode from "./graph/AnalysisNode";
import GraphToolbar from "./graph/GraphToolbar";
import NodeContextMenu, { type ContextMenuState } from "./graph/NodeContextMenu";
import NodeDetailPanel from "./graph/NodeDetailPanel";

type AppNode = Node<AnalysisNodeData>;

// Module-level stable reference. All 9 dimension types map to AnalysisNode; a
// new object here on every render would remount every node on each update.
const nodeTypes: NodeTypes = {
  concept: AnalysisNode,
  requirement: AnalysisNode,
  gap: AnalysisNode,
  benefit: AnalysisNode,
  drawback: AnalysisNode,
  feasibility: AnalysisNode,
  flaw: AnalysisNode,
  alternative: AnalysisNode,
  question: AnalysisNode,
};

export default function GraphPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const setNodes = useGraphStore((s) => s.setNodes);
  const setEdges = useGraphStore((s) => s.setEdges);
  const setNodePosition = useGraphStore((s) => s.setNodePosition);
  const { fitView } = useReactFlow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  // Cmd/Ctrl+Shift+L fits the graph to the viewport (ITER_07 §05.6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        void fitView({ duration: 400, padding: 0.1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitView]);

  // Fit the view after nodes are added (positions committed first via a delay).
  const prevNodeCount = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > prevNodeCount.current) {
      const t = setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 500);
      prevNodeCount.current = nodes.length;
      return () => clearTimeout(t);
    }
    prevNodeCount.current = nodes.length;
  }, [nodes.length, fitView]);

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  );
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: AppNode) => setNodePosition(node.id, node.position),
    [setNodePosition]
  );
  const onNodeClick = useCallback((_: React.MouseEvent, node: AppNode) => {
    setSelectedNodeId(node.id);
  }, []);
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: AppNode) => {
    event.preventDefault();
    setMenu({ nodeId: node.id, top: event.clientY, left: event.clientX });
  }, []);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <GraphToolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
      {selectedNodeId && (
        <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
      )}
      {menu && (
        <NodeContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onEdit={(id) => {
            setSelectedNodeId(id);
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}
