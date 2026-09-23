import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getOutstandingCents } from "@/lib/finance/settlements";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
const portalReceivableLookaheadDays = 15;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function portalReceivableDeadline(today: Date) {
  const deadline = new Date(today);
  deadline.setDate(deadline.getDate() + portalReceivableLookaheadDays);
  return deadline;
}

/**
 * Finance keeps future installments for cash-flow planning. The athlete portal
 * intentionally exposes only debts that are due and the next short window.
 */
function shouldShowPortalReceivable(entry: { status: string; dueDate: Date | null; outstandingCents: number }, today: Date, deadline: Date) {
  if (entry.outstandingCents <= 0) return false;
  if (entry.status === "OVERDUE") return true;
  return Boolean(entry.dueDate && entry.dueDate <= deadline);
}

export async function getPublicClientHome(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const player = await prisma.player.findFirst({ where: { id: playerId, arenaId: arena.id }, select: { name: true } });
  if (!player) return null;
  const now = new Date();
  const [announcements, events, eventPosts, student, reservations, pairs, entries] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 12, select: { id: true, title: true, message: true, pinned: true, linkUrl: true } }),
    tx.calendarEvent.findMany({ where: { arenaId: arena.id, featuredInPortal: true, scheduledAt: { gte: now } }, orderBy: { scheduledAt: "asc" }, take: 4, select: { id: true, title: true, notes: true, scheduledAt: true } }),
    tx.portalEventPost.findMany({ where: { arenaId: arena.id, active: true }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 6, select: { id: true, title: true, caption: true, imageUrl: true, linkUrl: true, pinned: true } }),
    tx.student.findFirst({ where: { arenaId: arena.id, playerId }, select: { remainingClasses: true, subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1, select: { classesPerMonth: true } }, monthlyBalances: { where: { referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` }, take: 1, select: { remainingClasses: true } } } }),
    tx.scheduleOccurrence.count({ where: { arenaId: arena.id, startsAt: { gte: now }, status: { not: "CANCELED" }, participants: { some: { playerId } } } }),
    tx.categoryPair.count({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] }, playerId }, select: { id: true, description: true, amountCents: true, dueDate: true, status: true, onlinePaymentUrl: true, onlinePaymentPublishedAt: true, settlements: { select: { amountCents: true, interestCents: true } } } })
  ]));
  const today = startOfDay(now);
  const deadline = portalReceivableDeadline(today);
  const balances = entries.map((entry) => ({ ...entry, outstandingCents: getOutstandingCents(entry.amountCents, entry.settlements) })).filter((entry) => entry.outstandingCents > 0);
  const portalBalances = balances.filter((entry) => shouldShowPortalReceivable(entry, today, deadline));
  const currentEntries = portalBalances.filter((entry) => entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate <= today));
  const futureEntries = portalBalances.filter((entry) => entry.status !== "OVERDUE" && entry.dueDate && entry.dueDate > today && entry.dueDate <= deadline);
  const due = currentEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const future = futureEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const overdue = currentEntries.some((entry) => entry.status === "OVERDUE" || (entry.dueDate && entry.dueDate < today));
  const charges = portalBalances.filter((entry) => entry.onlinePaymentUrl).map((entry) => ({ id: entry.id, description: entry.description, amount: money(entry.outstandingCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento", paymentUrl: entry.onlinePaymentUrl }));
  const monthlyClasses = student?.subscriptions[0]?.classesPerMonth ?? student?.remainingClasses ?? 0;
  const availableClasses = Math.min(student?.monthlyBalances[0]?.remainingClasses ?? monthlyClasses, monthlyClasses);
  return { announcements, events: events.map((event) => ({ ...event, when: date(event.scheduledAt) })), eventPosts, charges, summary: { financial: due ? `${money(due)} ${overdue ? "em atraso" : "em aberto"}` : "Em dia", futureFinancial: future ? `${money(future)} em lançamentos futuros` : null, financialStatus: overdue ? "overdue" : due ? "pending" : "active", classes: availableClasses, reservations, leagues: pairs } };
}

export async function getPublicClientFinance(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const now = new Date();
  const today = startOfDay(now);
  const deadline = portalReceivableDeadline(today);
  const entries = await withArenaTransaction(arena.id, (tx) => tx.financialEntry.findMany({
    where: { arenaId: arena.id, playerId, type: "REVENUE", status: { not: "VOIDED" } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, description: true, amountCents: true, dueDate: true, status: true, paidAt: true, onlinePaymentUrl: true, source: true, plan: { select: { name: true } }, sale: { select: { code: true, comanda: { select: { code: true, items: { select: { quantity: true, product: { select: { name: true } } } } } } } }, scheduleParticipant: { select: { occurrence: { select: { title: true, startsAt: true, occurrenceCourts: { select: { court: { select: { name: true } } } } } } } }, settlements: { select: { amountCents: true, interestCents: true } } }
  }));
  const rows = entries.map((entry) => {
    const outstandingCents = getOutstandingCents(entry.amountCents, entry.settlements);
    const overdue = outstandingCents > 0 && (entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate < today));
    const daysUntilDue = entry.dueDate ? Math.ceil((new Date(entry.dueDate).getTime() - today.getTime()) / 86_400_000) : null;
    const commandItems = entry.sale?.comanda?.items.map((item) => `${item.quantity}× ${item.product.name}`).join(" · ") ?? "";
    const reservation = entry.scheduleParticipant?.occurrence;
    const detail = commandItems ? `Comanda ${entry.sale?.comanda?.code ?? entry.sale?.code ?? ""} · ${commandItems}` : reservation ? `Reserva ${reservation.title} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(reservation.startsAt)}${reservation.occurrenceCourts.length ? ` · ${reservation.occurrenceCourts.map((court) => court.court.name).join(" · ")}` : ""}` : entry.plan?.name ? `Plano ${entry.plan.name}` : entry.description || "Lançamento financeiro";
    return { id: entry.id, description: entry.description || "Lançamento financeiro", detail, amountCents: outstandingCents, amount: money(outstandingCents || entry.amountCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento", paidAt: entry.paidAt ? new Intl.DateTimeFormat("pt-BR").format(entry.paidAt) : "", status: outstandingCents ? overdue ? "overdue" : "open" : "paid", urgency: overdue ? "overdue" : daysUntilDue !== null && daysUntilDue <= 5 ? "soon" : "normal", hasCharge: Boolean(entry.onlinePaymentUrl), paymentUrl: entry.onlinePaymentUrl };
  });
  const open = rows.filter((entry) => entry.status === "open" && shouldShowPortalReceivable({ status: entry.status, dueDate: entries.find((source) => source.id === entry.id)?.dueDate ?? null, outstandingCents: entry.amountCents }, today, deadline));
  const overdue = rows.filter((entry) => entry.status === "overdue");
  const paid = rows.filter((entry) => entry.status === "paid").slice(-12).reverse();
  return { health: overdue.length ? "attention" : open.length ? "upcoming" : "healthy", headline: overdue.length ? "Há um pagamento em aberto para cuidar" : open.length ? "Tudo certo por aqui" : "Está tudo saudável", detail: overdue.length ? "Regularize quando puder para continuar aproveitando a arena sem pendências." : open.length ? "Você tem pagamentos futuros organizados e nenhum valor em atraso." : "Nenhuma pendência financeira no momento. Aproveite a arena!", overdue, open, paid };
}

export async function getPublicClientComandas(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const [comandas, products, categories] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.comanda.findMany({ where: { arenaId: arena.id, playerId, status: "OPEN" }, include: { items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } } }, orderBy: { openedAt: "desc" } }),
    tx.product.findMany({ where: { arenaId: arena.id, active: true, stockQuantity: { gt: 0 } }, select: { id: true, name: true, priceCents: true, stockQuantity: true, category: { select: { name: true } } }, orderBy: { name: "asc" }, take: 120 }),
    tx.productCategory.findMany({ where: { arenaId: arena.id, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]));
  return { comandas: comandas.map((comanda) => ({ id: comanda.id, code: comanda.code, openedAt: date(comanda.openedAt), totalCents: comanda.items.reduce((total, item) => total + item.totalCents, 0), items: comanda.items.map((item) => ({ id: item.id, name: item.product.name, quantity: item.quantity, totalCents: item.totalCents })) })), categories, products: products.map((product) => ({ ...product, category: product.category?.name ?? "Sem categoria" })) };
}
