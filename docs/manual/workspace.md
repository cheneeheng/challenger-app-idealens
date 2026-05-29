# The Workspace

The analysis workspace is where you do the work. It is a split view:

- **Left — Chat panel.** Your conversation with the AI.
- **Right — Graph panel.** The live node graph the AI builds as it analyzes your idea.

The divider between the two panels is draggable, so you can give more room to whichever side
you are focused on.

## The chat panel

### Sending messages

- Type in the input at the bottom.
- **Enter** sends the message.
- **Shift+Enter** inserts a newline without sending.
- **Cmd+Enter** / **Ctrl+Enter** also sends.

### Streaming replies

The AI's response streams in live rather than appearing all at once. While a reply is
streaming, you'll see the text grow token by token, and graph nodes appear on the right in
step with the analysis.

If your connection drops mid-reply, IdeaLens attempts to resume the stream so you don't lose
a partially generated answer.

### How the conversation is remembered

Recent messages are sent to the AI verbatim so it has full context. When a conversation grows
long, older messages are automatically summarized to keep the AI focused without losing the
thread. This happens behind the scenes — you don't need to manage it.

## Choosing a model

Each analysis session uses one Anthropic model. You pick it when creating a new analysis, and
the choice is saved with the session.

| Model | Best for |
|-------|----------|
| **Claude Sonnet 4.6** (default) | Balanced quality and speed for most analyses. |
| **Claude Haiku 4.5** | Fastest and cheapest; good for quick passes. |
| **Claude Opus 4.8** | Deepest reasoning for complex or high-stakes ideas. |

Summarization of long conversations always uses the cheaper Haiku model, regardless of the
session model, to keep costs down.

> All model usage is billed to *your* Anthropic account via the API key you saved.

## Managing analyses

### The dashboard

The **Dashboard** lists your analyses, most recent first, with a short excerpt of the idea.
When you have many, a **Load more** button fetches the next page. Click any card to reopen that
analysis exactly where you left off — the chat history and the graph are both restored.

### Renaming an analysis

**Double-click the analysis name** in the workspace header to edit it, then press **Enter** to
save (or **Escape** to cancel). This makes sessions easier to find later.

### Deleting an analysis

Deleting a session removes its conversation and graph permanently. This cannot be undone.

## Next

- [The Graph](graph.md) — node types, the toolbar, and interactions.
