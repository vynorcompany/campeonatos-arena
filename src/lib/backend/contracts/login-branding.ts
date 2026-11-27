import { z } from "zod";

// Public presentation data only; this contract never establishes arena access.
export const loginBrandingSchema = z.object({
  arena: z.object({ name: z.string(), logoUrl: z.string().nullable() }).strict().nullable(),
}).strict();
export type LoginBranding = z.infer<typeof loginBrandingSchema>;
