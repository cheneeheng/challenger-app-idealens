# The Graph

The graph is the heart of IdeaLens. Every finding the AI produces becomes a node, and the
nodes are connected to show how the analysis fits together. It updates in real time as you chat.

## The nine dimensions

The AI breaks every idea down across nine fixed dimensions. Each node is one of these types,
color-coded so you can scan the graph at a glance:

| Dimension | Color | What it captures |
|-----------|-------|------------------|
| **Concept** | Indigo | The core idea and its key sub-concepts. |
| **Requirements** | Sky blue | What's needed to make the idea work. |
| **Gaps** | Amber | Missing pieces or unaddressed needs. |
| **Benefits** | Green | Upsides and value the idea creates. |
| **Drawbacks** | Red | Downsides, costs, and risks. |
| **Feasibility** | Violet | How realistic the idea is (carries a 0–10 score). |
| **Flaws** | Orange | Logical or structural problems. |
| **Alternatives** | Teal | Other approaches worth considering. |
| **Open questions** | Pink | Things that still need answering. |

**Feasibility nodes** show a score from 0 to 10. The score is color-coded: green (7+) is
strong, amber (4–6) is moderate, red (below 4) is weak.

When a node is updated by a new reply, it briefly highlights so you can see what just changed.

## Reading the graph

- Nodes are positioned automatically using an auto-layout algorithm, so related findings sit
  near each other.
- Edges (connections) show how findings relate — for example, a gap linked to the requirement
  it threatens.
- Pan by dragging the background; zoom with the scroll wheel or trackpad.

## The toolbar

The graph toolbar gives you quick controls:

- **Fit View** — zoom and center so the whole graph is visible.
- **Auto Layout** — re-run the automatic layout to tidy up node positions.
- **Add Node** — manually add your own node. Pick a dimension type, give it a label and
  content, and save. Useful for capturing your own observations alongside the AI's.
- **Delete Selected** — remove the node(s) you have selected.

## Interacting with nodes

### Inspect a node

Click a node to open the **detail panel**, which shows its full label and content (and score,
for feasibility nodes). Press **Escape** to close it.

### Node context menu

Right-click a node to open the context menu:

- **Edit** — change the node's label or content.
- **Delete** — remove the node from the graph.
- **Ask Claude about this** — drops a prompt like *"Tell me more about: <node label>"* into
  the chat input so you can dig deeper with one click.

### The graph-to-chat feedback loop

Your graph actions feed back into the conversation. For example, when you delete a node, a
short system note is added to the chat so the AI knows the graph changed and can reason about
it in its next reply. This keeps the conversation and the graph in sync.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **Escape** | Close the open panel, menu, or modal (detail panel, context menu, add-node dialog). |
| **Enter** | Send a chat message. |
| **Shift+Enter** | Newline in the chat input. |
| **Cmd/Ctrl+Enter** | Send a chat message. |

## Next

- [Account & API Key](account.md) — manage your profile and key.
- [FAQ & Troubleshooting](faq.md) — common questions.
