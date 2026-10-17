import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { getPortalDueUrgency } from "@/lib/portal/financial-status";
import { loadPortalFinancialEntries } from "@/lib/portal/finance-entries";
import { upcomingPlayerReservationsWhere } from "@/lib/portal/upcoming-reservations";
import { arenaToday, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
const portalReceivableLookaheadDays = 15;

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
  const player = await withArenaTransaction(arena.id, (tx) => tx.player.findFirst({ where: { id: playerId, arenaId: arena.id }, select: { name: true } }));
  if (!player) return null;
  const now = new Date();
  const arenaNow = instantToArenaWallClock(now);
  const reservationWhere = upcomingPlayerReservationsWhere(arena.id, playerId, now);
  const [announcements, events, eventPosts, student, reservations, upcomingReservations, pairs, entries, openComandas] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: arenaNow } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: arenaNow } }] }] }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 12, select: { id: true, title: true, message: true, pinned: true, linkUrl: true } }),
    tx.calendarEvent.findMany({ where: { arenaId: arena.id, featuredInPortal: true, scheduledAt: { gte: arenaNow } }, orderBy: { scheduledAt: "asc" }, take: 4, select: { id: true, title: true, notes: true, scheduledAt: true } }),
    tx.portalEventPost.findMany({ where: { arenaId: arena.id, active: true }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 6, select: { id: true, title: true, caption: true, imageUrl: true, linkUrl: true, pinned: true } }),
    tx.student.findFirst({ where: { arenaId: arena.id, playerId }, select: { remainingClasses: true, subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1, select: { classesPerMonth: true } }, monthlyBalances: { where: { referenceMonth: `${arenaNow.getFullYear()}-${String(arenaNow.getMonth() + 1).padStart(2, "0")}` }, take: 1, select: { remainingClasses: true } } } }),
    tx.scheduleOccurrence.count({ where: reservationWhere }),
    tx.scheduleOccurrence.findMany({ where: reservationWhere, orderBy: { startsAt: "asc" }, take: 3, select: { id: true, title: true, startsAt: true, status: true, occurrenceCourts: { select: { court: { select: { name: true } } } } } }),
    tx.categoryPair.count({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, status: { in: ["PENDING", "OVERDUE"] }, OR: [
      { playerId, type: "REVENUE" },
      { type: { in: ["REVENUE", "INCOME"] }, sale: { comanda: { playerId } } },
    ] }, select: { id: true, description: true, amountCents: true, dueDate: true, status: true, onlinePaymentUrl: true, onlinePaymentPublishedAt: true, settlements: { select: { amountCents: true, interestCents: true } } } }),
    tx.comanda.findMany({ where: { arenaId: arena.id, playerId, status: "OPEN", items: { some: {} } }, select: { items: { select: { totalCents: true } } } }),
  ]));
  const today = arenaToday(now);
  const deadline = portalReceivableDeadline(today);
  const balances = entries.map((entry) => ({ ...entry, outstandingCents: getOutstandingCents(entry.amountCents, entry.settlements) })).filter((entry) => entry.outstandingCents > 0);
  const portalBalances = balances.filter((entry) => shouldShowPortalReceivable(entry, today, deadline));
  const currentEntries = portalBalances.filter((entry) => entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate <= today));
  const futureEntries = portalBalances.filter((entry) => entry.status !== "OVERDUE" && entry.dueDate && entry.dueDate > today && entry.dueDate <= deadline);
  const due = currentEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const openComandaTotal = openComandas.reduce((total, comanda) => total + comanda.items.reduce((itemTotal, item) => itemTotal + item.totalCents, 0), 0);
  const hasOpenComanda = openComandas.length > 0;
  const future = futureEntries.reduce((total, entry) => total + entry.outstandingCents, 0);
  const overdue = currentEntries.some((entry) => entry.status === "OVERDUE" || (entry.dueDate && entry.dueDate < today));
  const dueSoon = futureEntries.some((entry) => getPortalDueUrgency(entry.dueDate, today, entry.status) === "soon");
  const charges = portalBalances.filter((entry) => entry.onlinePaymentUrl).map((entry) => ({ id: entry.id, description: entry.description, amount: money(entry.outstandingCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento", paymentUrl: entry.onlinePaymentUrl, urgency: getPortalDueUrgency(entry.dueDate, today, entry.status) }));
  const monthlyClasses = student?.subscriptions[0]?.classesPerMonth ?? student?.remainingClasses ?? 0;
  const availableClasses = Math.min(student?.monthlyBalances[0]?.remainingClasses ?? monthlyClasses, monthlyClasses);
  return { announcements, events: events.map((event) => ({ ...event, when: date(event.scheduledAt) })), eventPosts, charges, upcomingReservations: upcomingReservations.map((reservation) => ({ id: reservation.id, title: reservation.title, when: date(reservation.startsAt), courtName: reservation.occurrenceCourts.map((entry) => entry.court.name).join(" · ") || "Quadra a definir" })), summary: { financial: overdue ? `${money(due)} em atraso` : due || hasOpenComanda ? `${money(due + openComandaTotal)} em aberto` : "Em dia", futureFinancial: future ? `${money(future)} em lançamentos futuros` : null, financialStatus: overdue ? "overdue" : due || hasOpenComanda ? "pending" : "active", mobileFinancialStatus: overdue ? "overdue" as const : due || hasOpenComanda || dueSoon ? "soon" as const : "healthy" as const, mobileFinancialLabel: overdue ? "Pagamento em atraso" : due ? "Pagamento em aberto" : hasOpenComanda ? "Comanda em aberto" : dueSoon ? "Vence em até 3 dias" : "Tudo em dia", classes: availableClasses, reservations, leagues: pairs } };
}

export async function getPublicClientFinance(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const now = new Date();
  const today = arenaToday(now);
  const deadline = portalReceivableDeadline(today);
  const [[pendingEntries, recentPaidEntries], openComandas] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    loadPortalFinancialEntries(tx, arena.id, playerId, deadline),
    tx.comanda.findMany({
      where: { arenaId: arena.id, playerId, status: "OPEN", items: { some: {} } },
      orderBy: { openedAt: "desc" },
      select: { id: true, code: true, items: { select: { totalCents: true } } },
    }),
  ]));
  const entries = [...pendingEntries, ...recentPaidEntries];
  const rows = entries.map((entry) => {
    const outstandingCents = getOutstandingCents(entry.amountCents, entry.settlements);
    const overdue = entry.status !== "PAID" && outstandingCents > 0 && (entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate < today));
    const commandItems = entry.sale?.comanda?.items.map((item) => `${item.quantity}× ${item.product.name}`).join(" · ") ?? "";
    const reservation = entry.scheduleParticipant?.occurrence;
    const detail = commandItems ? `Comanda ${entry.sale?.comanda?.code ?? entry.sale?.code ?? ""} · ${commandItems}` : reservation ? `Reserva ${reservation.title} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(reservation.startsAt)}${reservation.occurrenceCourts.length ? ` · ${reservation.occurrenceCourts.map((court) => court.court.name).join(" · ")}` : ""}` : entry.plan?.name ? `Plano ${entry.plan.name}` : entry.description || "Lançamento financeiro";
    return { id: entry.id, description: entry.description || "Lançamento financeiro", detail, amountCents: outstandingCents, amount: money(outstandingCents || entry.amountCents), dueDate: entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "Sem vencimento", paidAt: entry.paidAt ? new Intl.DateTimeFormat("pt-BR").format(entry.paidAt) : "", status: entry.status === "PAID" || !outstandingCents ? "paid" : overdue ? "overdue" : "open", urgency: entry.status === "PAID" || !outstandingCents ? "normal" : getPortalDueUrgency(entry.dueDate, today, entry.status), hasCharge: Boolean(entry.onlinePaymentUrl), paymentUrl: entry.onlinePaymentUrl };
  });
  const open = rows.filter((entry) => entry.status === "open");
  const overdue = rows.filter((entry) => entry.status === "overdue");
  const paid = rows.filter((entry) => entry.status === "paid");
  const comandas = openComandas.map((comanda) => ({ id: comanda.id, code: comanda.code, amount: money(comanda.items.reduce((total, item) => total + item.totalCents, 0)) }));
  const health = overdue.length ? "attention" : open.length || comandas.length ? "upcoming" : "healthy";
  let headline = "Tudo em dia";
  let detail = "Nenhum pagamento pendente no momento.";
  if (overdue.length) {
    headline = "Pagamento em atraso";
    detail = "Confira os lançamentos vencidos abaixo.";
  } else if (open.length && comandas.length) {
    headline = "Pagamentos e comandas em aberto";
    detail = "Acompanhe os vencimentos e as comandas em andamento.";
  } else if (comandas.length) {
    headline = comandas.length === 1 ? "Comanda em aberto" : "Comandas em aberto";
    detail = "Acompanhe o consumo e feche a comanda no balcão.";
  } else if (open.length) {
    headline = "Próximos pagamentos";
    detail = "Confira os lançamentos dos próximos 15 dias.";
  }
  return { health, headline, detail, overdue, open, paid, comandas };
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
