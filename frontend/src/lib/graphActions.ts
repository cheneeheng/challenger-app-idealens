// Zod mirror of backend app/schemas/graph.py. Keep these in sync.
// z.discriminatedUnion reads `action` first, then validates the matching schema,
// so a malformed payload under the correct action throws ZodError cleanly.
import { z } from "zod";

export const dimensionType = z.enum([
  "concept",
  "requirement",
  "gap",
  "benefit",
  "drawback",
  "feasibility",
  "flaw",
  "alternative",
  "question",
]);

export type DimensionType = z.infer<typeof dimensionType>;

export const addPayload = z.object({
  id: z.string(),
  type: dimensionType,
  label: z.string().max(60),
  content: z.string(),
  score: z.number().min(0).max(10).nullable(),
  parent_id: z.string().nullable(),
});

// score is intentionally excluded — manual score edits persist via the graph_state
// snapshot (saveGraph), not through action payloads. Mirrors backend UpdatePayload.
// label/content are nullish: the backend's model_dump emits `null` (not omitted)
// for fields the LLM left unset, so the schema must accept null as "no change".
export const updatePayload = z.object({
  id: z.string(),
  label: z.string().max(60).nullish(),
  content: z.string().nullish(),
});

export const deletePayload = z.object({
  id: z.string(),
});

export const connectPayload = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
  type: z.string(),
});

export const graphAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), payload: addPayload }),
  z.object({ action: z.literal("update"), payload: updatePayload }),
  z.object({ action: z.literal("delete"), payload: deletePayload }),
  z.object({ action: z.literal("connect"), payload: connectPayload }),
]);

export type GraphAction = z.infer<typeof graphAction>;
