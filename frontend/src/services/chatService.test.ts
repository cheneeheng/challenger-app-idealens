import { afterEach, describe, expect, it, vi } from "vitest";

import { type ChatRequest, streamChat } from "./chatService";

const payload: ChatRequest = {
  session_id: "s1",
  message: "hello",
  model: "sonnet",
  graph_state: { nodes: [], edges: [] },
};

// Build a fetch Response whose body streams the given raw SSE chunks. Chunks
// are emitted verbatim so tests can split frames across read boundaries.
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return { ok: true, body: stream } as unknown as Response;
}

function makeCallbacks() {
  return {
    onToken: vi.fn(),
    onGraphAction: vi.fn(),
    onError: vi.fn(),
    onDone: vi.fn(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChat", () => {
  it("dispatches token and graph_action events, then done", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: token\ndata: {"text":"Hel"}\n\n',
          'event: token\ndata: {"text":"lo"}\n\n',
          'event: graph_action\ndata: {"action":"add","payload":{"id":"x"}}\n\n',
          "event: done\ndata: {}\n\n",
        ])
      )
    );
    const cb = makeCallbacks();
    await streamChat(payload, "token", cb);

    expect(cb.onToken.mock.calls.map((c) => c[0]).join("")).toBe("Hello");
    expect(cb.onGraphAction).toHaveBeenCalledWith({ action: "add", payload: { id: "x" } });
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });

  it("dispatches error events to onError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(['event: error\ndata: {"message":"boom"}\n\n', "event: done\ndata: {}\n\n"])
      )
    );
    const cb = makeCallbacks();
    await streamChat(payload, "token", cb);

    expect(cb.onError).toHaveBeenCalledWith("boom");
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });

  it("reassembles frames split across stream chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(["event: to", 'ken\ndata: {"text":"hi"}', "\n\n", "event: done\ndata: {}\n\n"])
      )
    );
    const cb = makeCallbacks();
    await streamChat(payload, "token", cb);

    expect(cb.onToken).toHaveBeenCalledWith("hi");
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });

  it("surfaces a non-ok response body detail via onError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ detail: "Rate limit exceeded" }),
      } as unknown as Response)
    );
    const cb = makeCallbacks();
    await streamChat(payload, "token", cb);

    expect(cb.onError).toHaveBeenCalledWith("Rate limit exceeded");
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });
});
