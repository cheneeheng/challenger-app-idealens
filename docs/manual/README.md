# IdeaLens — User Manual

IdeaLens turns any idea into a structured, visual analysis. You type an idea into a chat,
and an AI breaks it down across nine dimensions — building an interactive node graph that
grows as the conversation deepens.

This manual is for people *using* IdeaLens. For setup, architecture, and contributing,
see the [project README](../../README.md).

## Contents

1. [Getting Started](getting-started.md) — create an account, add your API key, run your first analysis.
2. [The Workspace](workspace.md) — the split-view layout, chat, streaming, and models.
3. [The Graph](graph.md) — the nine dimensions, node types, toolbar, and interactions.
4. [Account & API Key](account.md) — settings, password, API key, and deleting your account.
5. [FAQ & Troubleshooting](faq.md) — common questions and how to fix common problems.
6. [Deployment & Running the App](deployment.md) — for operators: start the app locally, run it
   in production, and what every environment variable is for.
7. [Running the Tests](testing.md) — for contributors: the three test suites, the one-command
   runner, and why the end-to-end test is skipped by default.

## What you need

- An IdeaLens account (free to create — see [Getting Started](getting-started.md)).
- Your own **Anthropic API key**. IdeaLens uses *your* key for every analysis, so usage is
  billed to your Anthropic account. The key is encrypted before it is stored and is never
  shown back to you after you save it.

## The core idea in 30 seconds

1. Register and sign in.
2. Add your Anthropic API key in **Settings**.
3. Start a new analysis and type an idea.
4. The AI replies in the chat *and* populates a graph on the right at the same time.
5. Keep chatting to dig deeper — the graph updates with every reply.
