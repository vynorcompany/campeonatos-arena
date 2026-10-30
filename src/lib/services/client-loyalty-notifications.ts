import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import type { ArenaTransaction } from "@/lib/rls";

export const loyaltyNotificationType = "LOYALTY_REWARD_READY";

export async function lockLoyaltyNotifications(tx: ArenaTransaction, arenaId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`loyalty:${arenaId}`}, 0))`;
}

/** Aggregate visits in the database; never load every reservation into the app server. */
export async function syncClientLoyaltyNotifications(tx: ArenaTransaction, arenaId: string, now = new Date()) {
  await lockLoyaltyNotifications(tx, arenaId);
  const arena = await tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { loyaltyEnabled: true, loyaltyStartedAt: true, loyaltyVisitsRequired: true, loyaltyRewardLabel: true } });
  if (!arena.loyaltyEnabled || !arena.loyaltyStartedAt) {
    await tx.arenaNotification.updateMany({ where: { arenaId, type: loyaltyNotificationType, readAt: null }, data: { readAt: now } });
    return { eligibleClients: 0 };
  }
  const required = Math.max(1, arena.loyaltyVisitsRequired);
  const eligible = await tx.$queryRaw<{ id: string; name: string; earned: number; available: number }[]>`
    WITH reservations AS (
      SELECT p."playerId", count(*) AS visits
      FROM "ScheduleOccurrence" o
      JOIN "ScheduleParticipant" p ON p."occurrenceId" = o.id
      WHERE o."arenaId" = ${arenaId} AND o.status = 'SCHEDULED'
        AND o."sourceType" IN ('BOOKING', 'ONLINE_BOOKING', 'COURT_BOOKING')
        AND lower(o."bookingTypeName") IN ('reserva', 'reserva fixa')
        AND o."endsAt" >= ${instantToArenaWallClock(arena.loyaltyStartedAt)}
        AND o."endsAt" < ${instantToArenaWallClock(now)}
      GROUP BY p."playerId"
    ), adjustments AS (
      SELECT "playerId", sum("visitsDelta") FILTER (WHERE kind = 'VISIT') AS visits,
        sum("visitsDelta") FILTER (WHERE kind = 'REWARD') AS redeemed
      FROM "LoyaltyActivity" WHERE "arenaId" = ${arenaId} AND "createdAt" >= ${arena.loyaltyStartedAt}
      GROUP BY "playerId"
    ), progress AS (
      SELECT p.id, p.name,
        (greatest(0, coalesce(r.visits, 0) + coalesce(a.visits, 0)) / ${required})::int AS earned,
        (greatest(0, coalesce(r.visits, 0) + coalesce(a.visits, 0) + coalesce(a.redeemed, 0)) / ${required})::int AS available
      FROM "Player" p LEFT JOIN reservations r ON r."playerId" = p.id
      LEFT JOIN adjustments a ON a."playerId" = p.id
      WHERE p."arenaId" = ${arenaId} AND p.active = true
    ) SELECT id, name, earned, available FROM progress WHERE available > 0
  `;
  const notifications = eligible.map(client => {
    const key = createHash("sha256").update(`${arenaId}:${client.id}:${arena.loyaltyStartedAt!.toISOString()}:${required}:${client.earned}`).digest("hex");
    return {
      id: `loyalty-${key}`,
      title: "Recompensa de fidelidade disponível",
      message: `${client.name} atingiu a meta de ${required} visitas. ${client.available} recompensa${client.available === 1 ? " disponível" : "s disponíveis"}: ${arena.loyaltyRewardLabel}.`,
      href: `/jogadores?q=${encodeURIComponent(client.name)}`,
    };
  });
  const activeIds = notifications.map(notice => notice.id);
  // Batch the writes and preserve readAt/createdAt, including across concurrent app replicas.
  for (let offset = 0; offset < notifications.length; offset += 500) {
    const rows = notifications.slice(offset, offset + 500).map(notice => Prisma.sql`(${notice.id}, ${arenaId}, ${loyaltyNotificationType}, ${notice.title}, ${notice.message}, ${notice.href}, ${now})`);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "ArenaNotification" (id, "arenaId", type, title, message, href, "createdAt")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message, href = EXCLUDED.href
      WHERE "ArenaNotification"."arenaId" = EXCLUDED."arenaId"
        AND ("ArenaNotification".title, "ArenaNotification".message, "ArenaNotification".href)
          IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.message, EXCLUDED.href)
    `);
  }
  // Redeemed, cancelled, inactive or superseded rewards must not remain actionable alerts.
  await tx.arenaNotification.updateMany({ where: { arenaId, type: loyaltyNotificationType, readAt: null, id: { notIn: activeIds } }, data: { readAt: now } });
  return { eligibleClients: eligible.length };
}
