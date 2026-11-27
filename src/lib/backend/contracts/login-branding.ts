import { z } from "zod";

// Public presentation data only; this contract never establishes arena access.
export const loginBrandingSchema = z.object({
  arenas: z.array(z.object({name:z.string(),slug:z.string()}).strict()).max(1000),
  arena: z.object({ name: z.string(), slug: z.string(), logoUrl: z.string().nullable() }).strict().nullable(),
}).strict();
export type LoginBranding = z.infer<typeof loginBrandingSchema>;
