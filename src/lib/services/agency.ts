import { prisma } from "@/lib/prisma";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export async function getAgencyMetrics() {
  const [arenas, usersCount, activeSubscriptions, openTickets, invoiceTotals] = await Promise.all([
    prisma.arena.findMany({
      include: {
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
    prisma.agencyInvoice.groupBy({ by: ["status"], _sum: { amountCents: true } }),
  ]);
  const mrrCents = activeSubscriptions.reduce((total, subscription) => total + subscription.plan.monthlyPriceCents, 0);

  return {
    arenas,
    usersCount,
    activeSubscriptions,
    openTickets,
    paidInvoiceCents: invoiceTotals.find((row) => row.status === "PAID")?._sum.amountCents ?? 0,
    openInvoiceCents: invoiceTotals.find((row) => row.status === "PENDING")?._sum.amountCents ?? 0,
    mrrCents
  };
}
