import type { DimensionType } from "../../lib/graphActions";

// Formats a node reference for the graph→chat audit messages, e.g.
// `"Feasibility › Cost too high"`.
export function nodeRef(type: DimensionType, label: string): string {
  const titled = type.charAt(0).toUpperCase() + type.slice(1);
  return `"${titled} › ${label}"`;
}
