import { z } from "zod";
export const managementShellSchema = z.object({
  notifications: z.array(z.object({ id: z.string(), title: z.string(), message: z.string(), href: z.string(), createdAt: z.string().datetime() }).strict()),
  whatsappUnreadCount: z.number().int().nonnegative(), comandaRequestCount: z.number().int().nonnegative(),
  billingAlert: z.object({ id: z.string(), daysRemaining: z.number().int().nonnegative(), deadline: z.string().datetime(), checkoutUrl: z.string() }).strict().nullable(),
}).strict();
