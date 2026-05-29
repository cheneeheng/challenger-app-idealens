import { Handle, type NodeProps, Position } from "@xyflow/react";

// Custom React Flow node rendering one analysis finding.
export default function AnalysisNode({ data }: NodeProps) {
  const label = (data as { label?: string }).label ?? "Node";
  const content = (data as { content?: string }).content ?? "";

  return (
    <div style={{ padding: "0.5rem 0.75rem", border: "1px solid #888", borderRadius: 8, background: "#fff", minWidth: 140 }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 600 }}>{label}</div>
      {content && <div style={{ fontSize: "0.75rem", color: "#666" }}>{content}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
