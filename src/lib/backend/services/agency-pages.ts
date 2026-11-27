import "server-only";
import { agencyDatabase as prisma } from "@/lib/auth/database";
import { arenaDatabase } from "@/lib/arena-database";
import { agencyMetricsSchema, agencyRecentTicketsSchema, agencyTicketHistorySchema, agencyPlansPageSchema, agencyConnectionsPageSchema } from "../contracts/agency-pages";

export async function resolveAgencyMetrics() {
  const [arenas, usersCount, activeSubscriptions, openTickets, invoiceTotals] = await Promise.all([
    prisma.arena.findMany({
      select: {
        id: true, name: true, accountStatus: true, city: true, email: true, slug: true,
        _count: {
          select: {
            members: true,
            players: true,
            students: true,
            supportTickets: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count(),
    prisma.agencySubscription.findMany({
      where: { status: "ACTIVE", plan: { isTrial: false }, OR: [{ trialEndsAt: null }, { trialEndsAt: { lte: new Date() } }] },
      select: { arenaId: true, plan: { select: { monthlyPriceCents: true } } }
    }),
    prisma.supportTicket.count({
      where: {
        status: {
          notIn: ["RESOLVED", "CLOSED"]
        }
      }
    }),
    prisma.agencyInvoice.groupBy({ by: ["status", "paymentReviewStatus"], _sum: { amountCents: true } }),
  ]);
  const mrrCents = activeSubscriptions.reduce((total, subscription) => total + subscription.plan.monthlyPriceCents, 0);

  return agencyMetricsSchema.parse({
    arenas,
    usersCount,
    activeSubscriptions,
    openTickets,
    paidInvoiceCents: invoiceTotals.filter((row) => row.status === "PAID" && !row.paymentReviewStatus).reduce((total, row) => total + (row._sum.amountCents ?? 0), 0),
    openInvoiceCents: invoiceTotals.filter((row) => row.status === "PENDING").reduce((total, row) => total + (row._sum.amountCents ?? 0), 0),
    reviewInvoiceCents: invoiceTotals.filter((row) => Boolean(row.paymentReviewStatus)).reduce((total, row) => total + (row._sum.amountCents ?? 0), 0),
    mrrCents
  });
}

const ticketSelect = { id: true, title: true, code: true, status: true, arena: { select: { name: true } } } as const;
export async function resolveAgencyRecentTickets() {
  return agencyRecentTicketsSchema.parse({ tickets: await prisma.supportTicket.findMany({
    select: ticketSelect, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 8,
  }) });
}
export async function resolveAgencyTicketHistory() {
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["RESOLVED", "CLOSED"] } },
    select: { ...ticketSelect, updatedAt: true, assignee: { select: { name: true } } },
    orderBy: { updatedAt: "desc" }, take: 80,
  });
  return agencyTicketHistorySchema.parse({ tickets: tickets.map(ticket => ({ ...ticket, updatedAt: ticket.updatedAt.toISOString() })) });
}
const planSelect = { id: true, name: true, monthlyPriceCents: true, isTrial: true, isActive: true } as const;
export async function resolveAgencyPlansPage() {
  const [plans, arenas, subscriptions, invoices, connection] = await Promise.all([
    prisma.agencyPlan.findMany({ select: planSelect, orderBy: [{ isTrial: "desc" }, { name: "asc" }] }),
    prisma.arena.findMany({ select: { id: true, name: true, accountStatus: true }, orderBy: { name: "asc" } }),
    prisma.agencySubscription.findMany({ select: { id: true, arenaId: true, planId: true, status: true, trialEndsAt: true, plan: { select: planSelect } }, orderBy: { arena: { name: "asc" } } }),
    prisma.agencyInvoice.findMany({ select: { id: true, period: true, amountCents: true, dueAt: true, status: true, paymentReviewStatus: true, providerPaymentId: true, checkoutUrl: true, arena: { select: { name: true } } }, orderBy: { dueAt: "desc" }, take: 50 }),
    prisma.agencyPaymentConnection.findUnique({ where: { id: "platform" }, select: { status: true, displayName: true, accountReference: true, graceDays: true } }),
  ]);
  return agencyPlansPageSchema.parse({ plans, arenas, subscriptions: subscriptions.map(row => ({ ...row, trialEndsAt: row.trialEndsAt?.toISOString() ?? null })), invoices: invoices.map(row => ({ ...row, dueAt: row.dueAt.toISOString() })), connection });
}
export async function resolveAgencyConnectionsPage() {
  const rows = await prisma.arena.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const arenas = await Promise.all(rows.map(async arena => {
    const connection = await arenaDatabase(arena.id).whatsAppConnection.findUnique({ where: { arenaId: arena.id }, select: { status: true, instanceName: true, connectedPhone: true, lastConnectedAt: true, lastError: true } });
    return { ...arena, whatsappConnection: connection ? { ...connection, lastConnectedAt: connection.lastConnectedAt?.toISOString() ?? null, lastError: connection.lastError ? "Não foi possível confirmar a conexão. Verifique a integração da arena." : "" } : null };
  }));
  return agencyConnectionsPageSchema.parse({ arenas });
}
