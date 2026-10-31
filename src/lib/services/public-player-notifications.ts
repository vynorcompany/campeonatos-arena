import "server-only";
import { playerLessonCredits } from "@/lib/academy/lesson-credit-portal";
import { portalCheckoutPolicy } from "@/lib/payments/portal-checkout-policy";

import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { arenaToday, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { getBookingDelinquency } from "@/lib/calendar/booking-delinquency";

export type AthletePortalNotification = {
  id: string;
  source: "PLAYER" | "ARENA" | "FINANCE";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  isRead: boolean;
  persistent?: boolean;
  creditBatchId?: string;
};

function leagueMatchHref(arenaSlug: string, categoryId: string, matchId: string) {
  const query = new URLSearchParams({ section: "leagues", tab: "games", leagueTab: "games", leagueCategory: categoryId });
  return `/home?arena=${encodeURIComponent(arenaSlug)}&${query.toString()}#jogo-${matchId}`;
}

export async function getAthletePortalNotifications(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, onlineBookingOverdueBlockDays: true } });
  if (!arena) return [] as AthletePortalNotification[];
  const credits = await withArenaTransaction(arena.id,tx=>playerLessonCredits(tx,arena.id,playerId,arenaSlug));
  const policy = portalCheckoutPolicy(await withArenaTransaction(arena.id, tx => tx.arenaOperationalSettings.findUnique({ where: { arenaId: arena.id } })));
  const now = new Date();
  const arenaNow = instantToArenaWallClock(now);
  const [playerNotifications, announcements, entries, reads, recordedLeagueMatches, bookingDelinquency] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.playerNotification.findMany({ where: { playerId, player: { arenaId: arena.id, active: true } }, orderBy: { createdAt: "desc" }, take: 24, select: { id: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true } }),
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: arenaNow } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: arenaNow } }] }] }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 6, select: { id: true, title: true, message: true, createdAt: true } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, playerId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 12, select: { id: true, description: true, amountCents: true, dueDate: true, createdAt: true, onlinePaymentUrl: true, status: true, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } } }),
    tx.playerPortalNotificationRead.findMany({ where: { playerId, player: { arenaId: arena.id, active: true } }, select: { notificationKey: true } }),
    tx.categoryMatch.findMany({ where: { competition: { format: "LEAGUE", category: { tournament: { arenaId: arena.id } } }, awayPair: { players: { some: { playerId } } }, homeScore: { not: null }, awayScore: { not: null } }, orderBy: { updatedAt: "desc" }, take: 24, select: { id: true, updatedAt: true, competition: { select: { categoryId: true } } } }),
    getBookingDelinquency(tx, arena.id, playerId, arena.onlineBookingOverdueBlockDays),
  ]));
  const readKeys = new Set(reads.map((item) => item.notificationKey));
  const today = arenaToday(now);
  const financial = (policy.visible ? entries : []).map((entry) => ({ entry, outstandingCents: getOutstandingCents(entry.amountCents, entry.settlements) })).filter(({ outstandingCents }) => outstandingCents > 0).map(({ entry, outstandingCents }) => {
    const overdue = entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate < today);
    return { id: `finance-${entry.id}`, source: "FINANCE" as const, title: overdue ? "Pagamento em atraso" : "Pagamento pendente", message: `${entry.description || "Lançamento financeiro"} · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(outstandingCents / 100)}`, href: (policy.enabled ? entry.onlinePaymentUrl : "") || `/home?arena=${encodeURIComponent(arenaSlug)}&section=finance`, createdAt: entry.createdAt.toISOString(), isRead: readKeys.has(`finance-${entry.id}`), persistent: overdue };
  });
  return [
    ...playerNotifications.filter(notification => policy.visible || notification.type !== "FIXED_BOOKING_OPEN_BALANCE").map((notification) => {
      const historicResultMatch = notification.type === "LEAGUE_MATCH" && notification.title === "Resultado lançado pela dupla mandante" && !notification.href.includes("#jogo-")
        ? recordedLeagueMatches.find((match) => notification.createdAt.getTime() >= match.updatedAt.getTime() && notification.createdAt.getTime() - match.updatedAt.getTime() < 5 * 60_000)
        : null;
      return { creditBatchId: notification.type === "LESSON_CREDIT_EXPIRY" && credits?.makeupEnabled ? credits.batches.find(b=>b.id===notification.id.split(":")[1] && b.near && !b.requestStatus)?.id : undefined, id: notification.id, source: "PLAYER" as const, title: notification.title, message: notification.message, href: historicResultMatch ? leagueMatchHref(arenaSlug, historicResultMatch.competition.categoryId, historicResultMatch.id) : notification.href || `/classificacao/${arenaSlug}`, createdAt: notification.createdAt.toISOString(), isRead: Boolean(notification.readAt) };
    }),
    ...announcements.map((announcement) => ({ id: `arena-${announcement.id}`, source: "ARENA" as const, title: announcement.title, message: announcement.message, href: `/home?arena=${encodeURIComponent(arenaSlug)}&section=announcements#aviso-${encodeURIComponent(announcement.id)}`, createdAt: announcement.createdAt.toISOString(), isRead: readKeys.has(`arena-${announcement.id}`) })),
    ...financial,
    ...(bookingDelinquency.blocked ? [{ id: "booking-delinquency", source: "FINANCE" as const, title: "Reservas temporariamente bloqueadas", message: policy.visible && !bookingDelinquency.requiresReview ? "Existem pagamentos em atraso. Regularize as pendências para voltar a reservar quadras." : `Entre em contato com a recepção para verificar as condições de novas reservas.${bookingDelinquency.reviewReference ? ` Protocolo: ${bookingDelinquency.reviewReference}.` : ""}`, href: policy.visible && !bookingDelinquency.requiresReview ? `/home?arena=${encodeURIComponent(arenaSlug)}&section=finance` : `/classificacao/${encodeURIComponent(arenaSlug)}/cancelamento`, createdAt: now.toISOString(), isRead: readKeys.has("booking-delinquency"), persistent: true }] : []),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 20);
}
