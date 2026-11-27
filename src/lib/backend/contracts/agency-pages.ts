import { z } from "zod";
import { safePortalUrl } from "./portal-support";

const text = z.string();
const count = z.number().int().nonnegative();
const date = z.iso.datetime();
const arenaName = z.object({ name: text }).strict();
const personName = z.object({ name: text }).strict();
const ticketSummary = z.object({ id: text, title: text, code: text, status: text, arena: arenaName }).strict();
export const agencyMetricsSchema = z.object({
  arenas: z.array(z.object({
    id: text, name: text, accountStatus: text, city: text, email: text, slug: text,
    _count: z.object({ members: count, players: count, students: count, supportTickets: count }).strict(),
  }).strict()),
  usersCount: count,
  activeSubscriptions: z.array(z.object({ arenaId: text, plan: z.object({ monthlyPriceCents: count }).strict() }).strict()),
  openTickets: count, paidInvoiceCents: count, openInvoiceCents: count, reviewInvoiceCents: count, mrrCents: count,
}).strict();
export const agencyRecentTicketsSchema = z.object({ tickets: z.array(ticketSummary).max(8) }).strict();
export const agencyTicketHistorySchema = z.object({ tickets: z.array(ticketSummary.extend({ updatedAt: date, assignee: personName.nullable() }).strict()).max(80) }).strict();
const plan = z.object({ id: text, name: text, monthlyPriceCents: count, isTrial: z.boolean(), isActive: z.boolean() }).strict();
export const agencyPlansPageSchema = z.object({
  plans: z.array(plan),
  arenas: z.array(z.object({ id: text, name: text, accountStatus: text }).strict()),
  subscriptions: z.array(z.object({ id: text, arenaId: text, planId: text, status: text, trialEndsAt: date.nullable(), plan }).strict()),
  invoices: z.array(z.object({ id: text, period: text, amountCents: count, dueAt: date, status: text, paymentReviewStatus: text, providerPaymentId: text, checkoutUrl: z.union([z.literal(""), safePortalUrl]), arena: arenaName }).strict()).max(50),
  connection: z.object({ status: text, displayName: text, accountReference: text, graceDays: count.nullable() }).strict().nullable(),
}).strict();
export const agencyConnectionsPageSchema = z.object({ arenas: z.array(z.object({
  id: text, name: text,
  whatsappConnection: z.object({ status: text, instanceName: text, connectedPhone: text, lastConnectedAt: date.nullable(), lastError: text }).strict().nullable(),
}).strict()) }).strict();
export const agencyPageSchemas = {
  metrics: agencyMetricsSchema, tickets: agencyRecentTicketsSchema, history: agencyTicketHistorySchema,
  plans: agencyPlansPageSchema, connections: agencyConnectionsPageSchema,
} as const;
export type AgencyPageView = keyof typeof agencyPageSchemas;
export type AgencyPlansPage = Omit<z.infer<typeof agencyPlansPageSchema>, "subscriptions" | "invoices"> & {
  subscriptions: Array<Omit<z.infer<typeof agencyPlansPageSchema>["subscriptions"][number], "trialEndsAt"> & { trialEndsAt: Date | null }>;
  invoices: Array<Omit<z.infer<typeof agencyPlansPageSchema>["invoices"][number], "dueAt"> & { dueAt: Date }>;
};
