import { beforeEach, describe, expect, it } from "vitest";

import { useChatStore } from "./chatStore";

describe("chatStore streaming", () => {
  beforeEach(() => useChatStore.getState().reset());

  it("accumulates tokens then finalizes into a message", () => {
    const store = useChatStore.getState();
    store.setStreaming(true);
    store.appendToken("Hel");
    store.appendToken("lo");
    expect(useChatStore.getState().streamingContent).toBe("Hello");

    useChatStore.getState().finalizeStreamingMessage();
    const { messages, streamingContent } = useChatStore.getState();
    expect(streamingContent).toBe("");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: "assistant", content: "Hello" });
  });

  it("finalize is a no-op when nothing was streamed", () => {
    useChatStore.getState().finalizeStreamingMessage();
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("reset clears messages, streaming flags, and draft", () => {
    const store = useChatStore.getState();
    store.addMessage({ id: "1", role: "user", content: "hi" });
    store.setDraft("typing");
    store.setStreaming(true);
    useChatStore.getState().reset();
    const s = useChatStore.getState();
    expect(s.messages).toHaveLength(0);
    expect(s.draft).toBe("");
    expect(s.isStreaming).toBe(false);
  });
});
