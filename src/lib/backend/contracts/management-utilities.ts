import { z } from "zod";
import { safePortalUrl } from "./portal-support";
export const accessUnavailableSchema = z.object({ reason: z.enum(["OVERDUE", "TRIAL_ENDED", "UNAVAILABLE"]), checkoutUrl: safePortalUrl.nullable() }).strict();
export const printerTestSchema = z.object({ printerPaper: z.string(), printerCopies: z.number().int().nonnegative() }).strict();
export const managementUtilitySchemas = { access: accessUnavailableSchema, printer: printerTestSchema } as const;
export type ManagementUtilityView = keyof typeof managementUtilitySchemas;
