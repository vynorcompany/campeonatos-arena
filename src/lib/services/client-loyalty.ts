import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import type { ArenaTransaction } from "@/lib/rls";

export function loyaltyProgress(completedReservations: number, activityDelta: number, visitsRequired: number) {
  const availableVisits = Math.max(0, completedReservations + activityDelta);
  return { availableVisits, availableRewards: Math.floor(availableVisits / Math.max(1, visitsRequired)) };
}

export async function loadClientLoyalty(tx: ArenaTransaction, arenaId: string, playerId: string, now = new Date()) {
  const [arena, player] = await Promise.all([
    tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { loyaltyEnabled: true, loyaltyStartedAt: true, loyaltyVisitsRequired: true, loyaltyRewardLabel: true } }),
    tx.player.findFirst({ where: { id: playerId, arenaId }, select: { id: true, name: true, active: true } }),
  ]);
  if (!player) throw new Error("Cliente não encontrado nesta arena.");
  const startedAt = arena.loyaltyStartedAt;
  if (!startedAt) return { player, settings: arena, completedReservations: 0, manualVisits: 0, redeemedVisits: 0, availableVisits: 0, availableRewards: 0, activities: [] };
  const [completedReservations, activityTotals, activities] = await Promise.all([
    tx.scheduleParticipant.count({ where: {
      playerId,
      occurrence: {
        arenaId,
        bookingTypeName: "Reserva",
        status: "SCHEDULED",
        endsAt: { gte: instantToArenaWallClock(startedAt), lt: instantToArenaWallClock(now) },
      },
    } }),
    tx.loyaltyActivity.groupBy({ by: ["kind"], where: { arenaId, playerId, createdAt: { gte: startedAt } }, _sum: { visitsDelta: true } }),
    tx.loyaltyActivity.findMany({ where: { arenaId, playerId, createdAt: { gte: startedAt } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, kind: true, visitsDelta: true, rewardLabel: true, notes: true, fulfilledAt: true, createdAt: true } }),
  ]);
  const manualVisits = activityTotals.find((item) => item.kind === "VISIT")?._sum.visitsDelta ?? 0;
  const redeemedVisits = -(activityTotals.find((item) => item.kind === "REWARD")?._sum.visitsDelta ?? 0);
  return { player, settings: arena, completedReservations, manualVisits, redeemedVisits, ...loyaltyProgress(completedReservations, manualVisits - redeemedVisits, arena.loyaltyVisitsRequired), activities };
}
