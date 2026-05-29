import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useGraphStore } from "../stores/graphStore";
import AnalysisNode from "./AnalysisNode";
import GraphToolbar from "./GraphToolbar";

const nodeTypes = { analysis: AnalysisNode };

export default function GraphPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <GraphToolbar />
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
