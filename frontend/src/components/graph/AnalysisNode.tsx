import { Handle, type NodeProps, Position } from "@xyflow/react";

import type { DimensionType } from "../../lib/graphActions";
import type { AnalysisNodeData } from "../../lib/types";

export const DIMENSION_COLORS: Record<DimensionType, string> = {
  concept: "#6366f1", // indigo
  requirement: "#0ea5e9", // sky
  gap: "#f59e0b", // amber
  benefit: "#22c55e", // green
  drawback: "#ef4444", // red
  feasibility: "#8b5cf6", // violet
  flaw: "#f97316", // orange
  alternative: "#14b8a6", // teal
  question: "#ec4899", // pink
};

function scoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

// Custom React Flow node rendering one analysis finding. The dimension type is
// read from data.type (the source of truth for display logic).
export default function AnalysisNode({ data }: NodeProps) {
  const { type, label, content, score } = data as AnalysisNodeData;
  const color = DIMENSION_COLORS[type] ?? "#888";

  return (
    <div
      style={{
        borderTop: `4px solid ${color}`,
        border: "1px solid #ddd",
        borderTopWidth: 4,
        borderTopColor: color,
        borderRadius: 8,
        background: "#fff",
        width: 200,
        padding: "0.5rem 0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <span
        style={{
          display: "inline-block",
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color,
          fontWeight: 700,
        }}
      >
        {type}
      </span>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{label}</div>
      {content && (
        <div style={{ fontSize: "0.75rem", color: "#555", marginTop: 4 }}>{content}</div>
      )}
      {type === "feasibility" && score != null && (
        <div
          style={{
            marginTop: 6,
            fontSize: "0.75rem",
            fontWeight: 700,
            color: scoreColor(score),
          }}
        >
          {score}/10
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
