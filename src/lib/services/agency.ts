import { prisma } from "@/lib/prisma";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export async function getAgencyMetrics() {
  const [arenas, usersCount, activeSubscriptions, openTickets, paidEntries] = await Promise.all([
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
    prisma.studentSubscription.findMany({
      where: { status: "ACTIVE" },
      select: { monthlyPriceCents: true, arenaId: true }
    }),
    prisma.supportTicket.count({
      where: {
        status: {
          notIn: ["RESOLVED", "CLOSED"]
        }
      }
    }),
    prisma.financialEntry.findMany({
      where: {
        status: "PAID"
      },
      select: {
        type: true,
        amountCents: true,
        arenaId: true,
        paidAt: true
      },
      orderBy: { paidAt: "desc" },
      take: 300
    })
  ]);
  const mrrCents = activeSubscriptions.reduce((total, subscription) => total + subscription.monthlyPriceCents, 0);

  return {
    arenas,
    usersCount,
    activeSubscriptions,
    openTickets,
    paidEntries,
    mrrCents
  };
}
