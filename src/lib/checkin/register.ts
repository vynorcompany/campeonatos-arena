import type { Prisma } from "@prisma/client";
import { instantToArenaWallClock } from "../calendar/arena-wall-clock";

export async function registerCourtCheckin(tx: Prisma.TransactionClient, input: {
  arenaId: string; playerId: string; occurrenceId: string; courtId: string; token: string;
}, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Arena" WHERE id = ${input.arenaId} FOR SHARE`;
  const arena = await tx.arena.findFirst({ where: { id: input.arenaId, checkinEnabled: true, checkinToken: input.token } });
  if (!arena || !input.token) throw new Error("Este QR Code foi desativado. Peça o código atual à recepção.");
  await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${input.occurrenceId} AND "arenaId" = ${input.arenaId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${input.playerId} AND "arenaId" = ${input.arenaId} FOR UPDATE`;
  const player = await tx.player.findFirst({ where: { id: input.playerId, arenaId: input.arenaId, active: true }, select: { id: true, name: true } });
  if (!player) throw new Error("Seu cadastro no clube não está ativo. Procure a recepção.");
  const existing = await tx.checkinRecord.findUnique({ where: { occurrenceId_playerId: { occurrenceId: input.occurrenceId, playerId: player.id } } });
  if (existing) return existing;
  const wallNow = instantToArenaWallClock(now);
  const occurrence = await tx.scheduleOccurrence.findFirst({ where: {
    id: input.occurrenceId, arenaId: input.arenaId, status: "SCHEDULED",
    startsAt: { lte: new Date(wallNow.getTime() + 60 * 60_000) }, endsAt: { gt: wallNow },
    occurrenceCourts: { some: { courtId: input.courtId, court: { arenaId: input.arenaId, active: true } } },
  }, include: { occurrenceCourts: { include: { court: true } } } });
  if (!occurrence) throw new Error("Este horário não está disponível para check-in. Ele abre uma hora antes da reserva e encerra ao final dela.");
  const court = occurrence.occurrenceCourts.find(row => row.courtId === input.courtId)!.court;
  const overlap = await tx.checkinRecord.findFirst({ where: { arenaId: input.arenaId, playerId: player.id, startsAt: { lt: occurrence.endsAt }, endsAt: { gt: occurrence.startsAt } } });
  if (overlap) throw new Error("Você já confirmou presença em outro horário que coincide com esta reserva. Procure a recepção.");
  const participant = await tx.scheduleParticipant.upsert({
    where: { occurrenceId_playerId: { occurrenceId: occurrence.id, playerId: player.id } },
    create: { occurrenceId: occurrence.id, playerId: player.id, checkedInAt: now }, update: { checkedInAt: now },
  });
  if (!occurrence.responsiblePlayerId) await tx.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { responsiblePlayerId: player.id } });
  const record = await tx.checkinRecord.create({ data: {
    arenaId: input.arenaId, occurrenceId: occurrence.id, playerId: player.id, playerName: player.name,
    courtId: court.id, courtName: court.name, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt,
    amountCents: participant.amountCents, financialEntryId: participant.financialEntryId, createdAt: now,
  } });
  await tx.auditEvent.create({ data: { arenaId: input.arenaId, actorId: player.id, actorName: player.name, action: "COURT_CHECKIN", entityId: occurrence.id, details: { code: court.name, label: player.name, startsAt: occurrence.startsAt.toISOString(), endsAt: occurrence.endsAt.toISOString(), totalCents: participant.amountCents, financialEntryId: participant.financialEntryId } } });
  return record;
}
