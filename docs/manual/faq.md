# FAQ & Troubleshooting

## Getting started

**Do I need my own API key?**
Yes. IdeaLens runs every analysis with your own Anthropic API key, and usage is billed to
your Anthropic account. Add it in [Settings](account.md#your-api-key).

**Why are the Dashboard and analysis pages locked?**
You haven't saved an API key yet. Go to **Settings** and add one — those pages unlock as soon
as a key is present.

**Where do I get an Anthropic API key?**
From the [Anthropic Console](https://console.anthropic.com/). Create a key there and paste it
into IdeaLens Settings.

## Running analyses

**The AI reply stopped partway through.**
IdeaLens streams replies live and tries to resume if the connection drops. If a reply looks
cut off, send a short follow-up like "continue" — the AI has the prior context.

**My request was rejected or rate-limited.**
The chat endpoint is rate-limited to protect the service (30 requests per minute). Wait a
moment and try again. Separately, Anthropic may rate-limit your API key — check your usage and
limits in the Anthropic Console.

**An analysis failed with an error about the API key.**
Your saved key may be invalid, revoked, or out of credit. Replace it in
[Settings](account.md#adding-or-replacing-your-key) and try again.

**Which model should I use?**
- **Sonnet 4.6** (default) — balanced, good for most ideas.
- **Haiku 4.5** — fastest and cheapest for quick passes.
- **Opus 4.8** — deepest reasoning for complex ideas.

See [The Workspace](workspace.md#choosing-a-model) for details. The model is chosen per
analysis when you create it.

## The graph

**Why didn't the graph change after a reply?**
Not every reply mutates the graph — some replies are purely conversational. The graph updates
only when the AI emits graph actions (add, update, delete, connect).

**The layout looks messy.**
Use **Auto Layout** in the toolbar to re-tidy node positions, or **Fit View** to recenter.

**Can I add my own nodes?**
Yes. Use **Add Node** in the toolbar to add a node of any dimension type with your own label
and content. See [The Graph](graph.md#the-toolbar).

**What does the number on a feasibility node mean?**
It's a 0–10 feasibility score. Green (7+) is strong, amber (4–6) is moderate, red (below 4) is
weak.

## Account

**Can I change my API key?**
Yes — paste a new key in Settings and save; it replaces the old one. Keys are never displayed
after saving for security.

**How do I change my password?**
In **Settings**, enter your current password and your new password (twice) and save. You need
to know your current password to change it. If you can't sign in at all, contact whoever
administers your IdeaLens instance.

**What happens when I delete my account?**
Everything is permanently removed: your profile, your saved key, and all analyses. This cannot
be undone. See [Account & API Key](account.md#deleting-your-account).

## Still stuck?

For setup, deployment, or technical issues, see the [project README](../../README.md) and the
plans in `docs/planning/`. The live API reference is at `/docs` on the running backend.
