import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import type { AnalysisNodeData } from "../lib/types";
import { computeDagreLayout, getIncrementalPosition } from "./graphLayout";

type AppNode = Node<AnalysisNodeData>;

const node = (id: string, userPositioned = false, x = 0, y = 0): AppNode => ({
  id,
  type: "concept",
  position: { x, y },
  data: { type: "concept", label: id, content: "", userPositioned },
});

describe("computeDagreLayout", () => {
  it("repositions non-user-positioned nodes", () => {
    const nodes = [node("a"), node("b")];
    const edges: Edge[] = [{ id: "e", source: "a", target: "b" }];
    const out = computeDagreLayout(nodes, edges);
    // Dagre lays a above b on the TB axis.
    const a = out.find((n) => n.id === "a")!;
    const b = out.find((n) => n.id === "b")!;
    expect(b.position.y).toBeGreaterThan(a.position.y);
  });

  it("preserves the position of user-positioned nodes", () => {
    const pinned = node("a", true, 999, 999);
    const out = computeDagreLayout([pinned, node("b")], []);
    expect(out.find((n) => n.id === "a")!.position).toEqual({ x: 999, y: 999 });
  });
});

describe("getIncrementalPosition", () => {
  it("returns the root anchor for an empty graph", () => {
    expect(getIncrementalPosition([])).toEqual({ x: 400, y: 100 });
  });

  it("offsets below the lowest existing node", () => {
    const pos = getIncrementalPosition([node("a", false, 0, 200)]);
    expect(pos.y).toBe(320);
  });
});
