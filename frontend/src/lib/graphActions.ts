// Zod mirror of backend app/schemas/graph.py. Keep these in sync.
import { z } from "zod";

export const addPayload = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  content: z.string(),
  score: z.number().nullable().optional(),
  parent_id: z.string().nullable().optional(),
});

export const updatePayload = z.object({
  id: z.string(),
  label: z.string().optional(),
  content: z.string().optional(),
  score: z.number().nullable().optional(),
});

export const deletePayload = z.object({
  id: z.string(),
});

export const connectPayload = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.string().optional(),
});

export const graphAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), payload: addPayload }),
  z.object({ action: z.literal("update"), payload: updatePayload }),
  z.object({ action: z.literal("delete"), payload: deletePayload }),
  z.object({ action: z.literal("connect"), payload: connectPayload }),
]);

export type GraphAction = z.infer<typeof graphAction>;
