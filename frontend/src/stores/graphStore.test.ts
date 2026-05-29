import { beforeEach, describe, expect, it } from "vitest";

import { useGraphStore } from "./graphStore";

const addAction = (id: string, type = "concept") => ({
  action: "add",
  payload: { id, type, label: `label-${id}`, content: "c", score: null, parent_id: null },
});

describe("graphStore.applyGraphActions", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("adds nodes for valid add actions", () => {
    useGraphStore.getState().applyGraphActions([addAction("a"), addAction("b")]);
    const { nodes } = useGraphStore.getState();
    expect(nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(nodes[0].data.type).toBe("concept");
  });

  it("merges label/content on update without touching score", () => {
    useGraphStore.getState().applyGraphActions([
      { action: "add", payload: { id: "x", type: "feasibility", label: "old", content: "c", score: 5, parent_id: null } },
    ]);
    useGraphStore.getState().applyGraphActions([
      { action: "update", payload: { id: "x", label: "new" } },
    ]);
    const node = useGraphStore.getState().nodes.find((n) => n.id === "x");
    expect(node?.data.label).toBe("new");
    expect(node?.data.score).toBe(5);
  });

  it("deletes a node and its incident edges", () => {
    useGraphStore.getState().applyGraphActions([
      addAction("a"),
      addAction("b"),
      { action: "connect", payload: { source: "a", target: "b", label: "rel", type: "default" } },
    ]);
    expect(useGraphStore.getState().edges).toHaveLength(1);

    useGraphStore.getState().applyGraphActions([{ action: "delete", payload: { id: "a" } }]);
    expect(useGraphStore.getState().nodes.map((n) => n.id)).toEqual(["b"]);
    expect(useGraphStore.getState().edges).toHaveLength(0);
  });

  it("skips invalid actions (unknown dimension type) without throwing", () => {
    useGraphStore.getState().applyGraphActions([
      addAction("good"),
      { action: "add", payload: { id: "bad", type: "not-a-dimension", label: "x", content: "", score: null, parent_id: null } },
    ]);
    expect(useGraphStore.getState().nodes.map((n) => n.id)).toEqual(["good"]);
  });

  it("preserves a userPositioned node's position through a layout pass", () => {
    useGraphStore.getState().applyGraphActions([addAction("a")]);
    useGraphStore.getState().setNodePosition("a", { x: 777, y: 555 });
    // Adding another node triggers computeDagreLayout, which must not move
    // the pinned node.
    useGraphStore.getState().applyGraphActions([addAction("b")]);
    const a = useGraphStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.data.userPositioned).toBe(true);
    expect(a.position).toEqual({ x: 777, y: 555 });
  });
});

describe("graphStore.loadGraph", () => {
  beforeEach(() => useGraphStore.getState().reset());

  it("normalizes a flat seed node into a React Flow node", () => {
    useGraphStore.getState().loadGraph({
      nodes: [{ id: "root", type: "concept", label: "Idea", content: "", position: { x: 400, y: 50 } }],
      edges: [],
    });
    const node = useGraphStore.getState().nodes[0];
    expect(node.id).toBe("root");
    expect(node.data.label).toBe("Idea");
    expect(node.data.userPositioned).toBe(false);
    expect(node.position).toEqual({ x: 400, y: 50 });
  });
});
