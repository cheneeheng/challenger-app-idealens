# Getting Started

This guide takes you from zero to your first analysis.

## 1. Create an account

1. Open IdeaLens in your browser (by default, http://localhost:3000).
2. On the sign-in screen, choose **Register** (or go to `/register`).
3. Enter your email and a password, then submit.

You are signed in automatically after registering. Your session stays active across page
reloads; if your access token expires, IdeaLens refreshes it silently in the background.

## 2. Add your Anthropic API key

IdeaLens runs every analysis with *your* Anthropic API key, so you must add one before you
can create or run an analysis.

1. Go to **Settings** (from the header menu, or navigate to `/settings`).
2. Paste your Anthropic API key into the API key field and save.
3. Once saved, the key is encrypted at rest. For security, it is never displayed again —
   you will only see whether a key is set.

> Don't have a key yet? Create one in your [Anthropic Console](https://console.anthropic.com/).
> Usage from IdeaLens is billed to that Anthropic account.

Until a key is saved, the **Dashboard** and analysis workspace are locked. The **Settings**
page stays accessible so you can add your key.

## 3. Start a new analysis

1. Go to the **Dashboard**.
2. Click **New Analysis**.
3. In the modal, **describe your idea** in the text box — a sentence or a paragraph both work.
4. Optionally pick the AI model (see [The Workspace](workspace.md#choosing-a-model)); it
   defaults to Claude Sonnet.
5. Confirm to create the analysis.

## 4. Watch the first analysis run

Your idea is **sent automatically as the first message** when the analysis is created — you
don't need to retype it. You land in the split-view workspace, where:

- The AI's reply streams in token by token in the chat panel on the left.
- Nodes appear in the graph on the right as the analysis is generated.

## 5. Go deeper

Keep the conversation going from the chat panel. Ask follow-up questions, challenge a finding,
or request more detail. Type your message and press **Enter** to send (use **Shift+Enter** for
a newline, or **Cmd/Ctrl+Enter** to send).

Each reply can add, update, delete, or connect nodes, so the graph evolves to reflect the
current state of the analysis.

You can also click nodes in the graph to inspect them or feed them back into the chat — see
[The Graph](graph.md).

## Next steps

- [The Workspace](workspace.md) — get comfortable with the layout, streaming, and models.
- [The Graph](graph.md) — understand the nine dimensions and how to interact with nodes.
- [Account & API Key](account.md) — manage your profile, password, and key.
