import { z } from "zod";
export const arenaSlugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const notificationEntriesSchema = z.array(z.object({ id: z.string().min(1).max(256), source: z.enum(['PLAYER', 'ARENA', 'FINANCE']) }).strict()).max(100);
export const portalNotificationReadSchema = z.object({ arenaSlug: arenaSlugSchema, entries: notificationEntriesSchema }).strict();
export const managementNotificationReadSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('one'), id: z.string().min(1).max(256) }).strict(),
  z.object({ operation: z.literal('all') }).strict(),
]);
export const notificationOutcomeSchema = z.object({ error: z.string().nullable() }).strict();
export const portalNotificationsSchema = z.array(z.object({
  id: z.string(), source: z.enum(['PLAYER', 'ARENA', 'FINANCE']), title: z.string(), message: z.string(), href: z.string(),
  createdAt: z.string().datetime(), isRead: z.boolean(), persistent: z.boolean().optional(), creditBatchId: z.string().optional(),
}).strict()).max(20);
export type AthletePortalNotification = z.infer<typeof portalNotificationsSchema>[number];
