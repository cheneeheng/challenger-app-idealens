import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  display_name: z.string().nullable().optional(),
  has_api_key: z.boolean(),
  created_at: z.string(),
});

export type User = z.infer<typeof userSchema>;
