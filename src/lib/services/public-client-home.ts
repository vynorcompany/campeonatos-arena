import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getOutstandingCents } from "@/lib/finance/settlements";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);

export async function getPublicClientHome(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const player = await prisma.player.findFirst({ where: { id: playerId, arenaId: arena.id }, select: { name: true } });
  if (!player) return null;
  const now = new Date();
  const [announcements, events, eventPosts, student, reservations, pairs, entries] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, title: true, message: true } }),
    tx.calendarEvent.findMany({ where: { arenaId: arena.id, featuredInPortal: true, scheduledAt: { gte: now } }, orderBy: { scheduledAt: "asc" }, take: 4, select: { id: true, title: true, notes: true, scheduledAt: true } }),
    tx.portalEventPost.findMany({ where: { arenaId: arena.id, active: true }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, caption: true, imageUrl: true, linkUrl: true } }),
    tx.student.findFirst({ where: { arenaId: arena.id, playerId }, select: { remainingClasses: true } }),
    tx.scheduleOccurrence.count({ where: { arenaId: arena.id, startsAt: { gte: now }, status: { not: "CANCELED" }, participants: { some: { playerId } } } }),
    tx.categoryPair.count({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] }, playerId }, select: { id: true, description: true, amountCents: true, dueDate: true, status: true, onlinePaymentUrl: true, onlinePaymentPublishedAt: true, settlements: { select: { amountCents: true, interestCents: true } } } })
  ]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const balances = entries.map((entry) => ({ ...entry, outstandingCents: getOutstandingCents(entry.amountCents, entry.settlements) })).filter((entry) => entry.outstandingCents > 0);
  const currentEntries = balances.filter((entry) => entry.status === "OVERDUE" || !entry.dueDate || entry.dueDate <= today);
  const futureEntries = balances.filter((entry) => entry.status !== "OVERDUE" && entry.dueDate && entry.dueDate > today);
  const due = currentEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const future = futureEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const overdue = currentEntries.some((entry) => entry.status === "OVERDUE" || (entry.dueDate && entry.dueDate < today));
  const charges = balances.filter((entry) => entry.onlinePaymentUrl).map((entry) => ({ id: entry.id, description: entry.description, amount: money(entry.outstandingCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento" }));
  return { announcements, events: events.map((event) => ({ ...event, when: date(event.scheduledAt) })), eventPosts, charges, summary: { financial: due ? `${money(due)} ${overdue ? "em atraso" : "em aberto"}` : "Em dia", futureFinancial: future ? `${money(future)} em lançamentos futuros` : null, financialStatus: overdue ? "overdue" : due ? "pending" : "active", classes: student?.remainingClasses ?? 0, reservations, leagues: pairs } };
}

export async function getPublicClientFinance(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entries = await withArenaTransaction(arena.id, (tx) => tx.financialEntry.findMany({
    where: { arenaId: arena.id, playerId, type: "REVENUE", status: { not: "VOIDED" } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, description: true, amountCents: true, dueDate: true, status: true, paidAt: true, onlinePaymentUrl: true, settlements: { select: { amountCents: true, interestCents: true } } }
  }));
  const rows = entries.map((entry) => {
    const outstandingCents = getOutstandingCents(entry.amountCents, entry.settlements);
    const overdue = outstandingCents > 0 && Boolean(entry.dueDate && entry.dueDate < today);
    const daysUntilDue = entry.dueDate ? Math.ceil((new Date(entry.dueDate).getTime() - today.getTime()) / 86_400_000) : null;
    return { id: entry.id, description: entry.description || "Lançamento financeiro", amount: money(outstandingCents || entry.amountCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento", paidAt: entry.paidAt ? new Intl.DateTimeFormat("pt-BR").format(entry.paidAt) : "", status: outstandingCents ? overdue ? "overdue" : "open" : "paid", urgency: overdue ? "overdue" : daysUntilDue !== null && daysUntilDue <= 5 ? "soon" : "normal", hasCharge: Boolean(entry.onlinePaymentUrl) };
  });
  const open = rows.filter((entry) => entry.status === "open");
  const overdue = rows.filter((entry) => entry.status === "overdue");
  const paid = rows.filter((entry) => entry.status === "paid").slice(-12).reverse();
  return { health: overdue.length ? "attention" : open.length ? "upcoming" : "healthy", headline: overdue.length ? "Há um pagamento em aberto para cuidar" : open.length ? "Tudo certo por aqui" : "Está tudo saudável", detail: overdue.length ? "Regularize quando puder para continuar aproveitando a arena sem pendências." : open.length ? "Você tem pagamentos futuros organizados e nenhum valor em atraso." : "Nenhuma pendência financeira no momento. Aproveite a arena!", overdue, open, paid };
}
