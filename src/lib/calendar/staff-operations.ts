import { lockAvailableBookingServices } from "./booking-services";
import type { ArenaTransaction } from "@/lib/rls";
import { assertCourtBookingMayBeEdited } from "./court-booking-edit-safety";
import { activeCourtOccurrenceWhere } from "./online-booking-hold";

export async function manuallyCheckInParticipant(tx: ArenaTransaction, input: { arenaId: string; occurrenceId: string; playerId: string; actorId: string; actorName: string }, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${input.occurrenceId} AND "arenaId" = ${input.arenaId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${input.playerId} AND "arenaId" = ${input.arenaId} FOR UPDATE`;
  const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: input.occurrenceId, arenaId: input.arenaId, status: "SCHEDULED" }, include: { occurrenceCourts: { include: { court: true } }, participants: { where: { playerId: input.playerId }, include: { player: true } } } });
  const participant = occurrence?.participants[0]; const court = occurrence?.occurrenceCourts[0]?.court;
  if (!occurrence || !court) throw new Error("Selecione um atleta desta reserva confirmada.");
  if (!participant) throw new Error("Salve o atleta na reserva antes de fazer o check-in.");
  if (!participant.player.active) throw new Error("Este cliente está inativo. Ative o cadastro antes de fazer o check-in.");
  if (participant.checkedInAt) return participant.checkedInAt;
  const overlap = await tx.checkinRecord.findFirst({ where: { arenaId: input.arenaId, playerId: input.playerId, occurrenceId: { not: occurrence.id }, startsAt: { lt: occurrence.endsAt }, endsAt: { gt: occurrence.startsAt } } });
  if (overlap) throw new Error("Este atleta já realizou check-in em outro horário coincidente.");
  await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { checkedInAt: now } });
  await tx.checkinRecord.upsert({ where: { occurrenceId_playerId: { occurrenceId: occurrence.id, playerId: participant.playerId } }, update: {}, create: { arenaId: input.arenaId, occurrenceId: occurrence.id, playerId: participant.playerId, playerName: participant.player.name, courtId: court.id, courtName: court.name, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, amountCents: participant.amountCents, financialEntryId: participant.financialEntryId, createdAt: now } });
  await tx.auditEvent.create({ data: { arenaId: input.arenaId, actorId: input.actorId, actorName: input.actorName, action: "COURT_CHECKIN_MANUAL", entityId: occurrence.id, details: { label: participant.player.name, code: court.name } } });
  return now;
}

/** Reserve shared equipment and charge its exact cost once across the current roster. */
export async function addOptionalBookingService(tx: ArenaTransaction, arenaId: string, occurrenceId: string, productId: string) {
  await assertCourtBookingMayBeEdited(tx, arenaId, occurrenceId);
  const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId, status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] } }, include: { occurrenceCourts: true, participants: { orderBy: { id: "asc" }, include: { player: { select: { name: true } } } } } });
  if (!occurrence || !occurrence.participants.length) throw new Error("Adicione atletas à reserva antes de inserir o serviço.");
  if (occurrence.participants.some(p => Boolean(p.paymentMethod))) throw new Error("Revise o pagamento da reserva antes de inserir o serviço.");
  if (await tx.scheduleServiceReservation.findUnique({ where: { occurrenceId_productId: { occurrenceId, productId } } })) return;
  const product = await tx.product.findFirst({ where: { id: productId, arenaId, active: true, isService: true, showOnAgenda: true }, select: { id: true } });
  if (!product) throw new Error("Serviço indisponível na grade desta arena.");
  const [service] = await lockAvailableBookingServices(tx, arenaId, [productId], occurrence.startsAt, occurrence.endsAt, { requireVisible: false, courtIds: occurrence.occurrenceCourts.map(c => c.courtId) });
  for (const [index, participant] of occurrence.participants.entries()) {
    const share = Math.floor(service.priceCents / occurrence.participants.length) + (index < service.priceCents % occurrence.participants.length ? 1 : 0);
    const amountCents = participant.amountCents + share;
    let financialEntryId = participant.financialEntryId;
    if (financialEntryId) await tx.financialEntry.update({ where: { id: financialEntryId, arenaId }, data: { amountCents } });
    else if (amountCents > 0) financialEntryId = (await tx.financialEntry.create({ data: { arenaId, playerId: participant.playerId, counterpartyName: participant.player.name, type: "REVENUE", category: "Reserva", description: `Reserva · ${occurrence.title}`, amountCents, status: "PENDING", dueDate: occurrence.startsAt, source: "SCHEDULE_BOOKING", externalReference: occurrence.id } })).id;
    await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { amountCents, financialEntryId } });
  }
  await tx.scheduleServiceReservation.create({ data: { arenaId, occurrenceId, productId, serviceName: service.serviceName, priceCents: service.priceCents } });
  await tx.scheduleOccurrence.update({ where: { id: occurrenceId, arenaId }, data: { updatedAt: new Date() } });
}

export async function removeOptionalBookingService(tx: ArenaTransaction, arenaId: string, occurrenceId: string, serviceId: string) {
  await assertCourtBookingMayBeEdited(tx, arenaId, occurrenceId);
  const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId, status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] } }, include: { participants: { orderBy: { id: "asc" } }, serviceReservations: { where: { id: serviceId } } } });
  const service = occurrence?.serviceReservations[0];
  if (!occurrence || !service) throw new Error("Serviço não encontrado nesta reserva.");
  if (occurrence.participants.some(p => Boolean(p.paymentMethod))) throw new Error("Revise o pagamento da reserva antes de remover o serviço.");
  const total = occurrence.participants.reduce((sum, p) => sum + p.amountCents, 0);
  if (total < service.priceCents) throw new Error("O valor da reserva precisa de revisão financeira antes de remover este serviço.");
  // Distribute the reduction proportionally, preserving the sum exactly in cents.
  let deducted = 0; let cumulative = 0;
  for (const [index, participant] of occurrence.participants.entries()) {
    cumulative += participant.amountCents;
    const target = index === occurrence.participants.length - 1 ? service.priceCents : Math.floor(service.priceCents * cumulative / Math.max(1, total));
    const reduction = target - deducted; deducted = target;
    const amountCents = participant.amountCents - reduction;
    await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { amountCents } });
    if (participant.financialEntryId) await tx.financialEntry.update({ where: { id: participant.financialEntryId, arenaId }, data: { amountCents } });
  }
  await tx.scheduleServiceReservation.delete({ where: { id: service.id, arenaId } });
  await tx.scheduleOccurrence.update({ where: { id: occurrenceId, arenaId }, data: { updatedAt: new Date() } });
}

export type BlockSlot = { courtId: string; startsAt: Date; endsAt: Date };
export async function blockCourtSlots(tx: ArenaTransaction, arenaId: string, slots: BlockSlot[]) {
  if (!slots.length || slots.length > 200 || slots.some(s => !Number.isFinite(s.startsAt.getTime()) || !Number.isFinite(s.endsAt.getTime()) || s.endsAt <= s.startsAt)) throw new Error("Selecione de 1 a 200 horários válidos.");
  const unique = [...new Map(slots.map(slot => [`${slot.courtId}:${slot.startsAt.toISOString()}`, slot])).values()];
  const arena = await tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { scheduleSlotMinutes: true, scheduleStartMinute: true, scheduleEndMinute: true } });
  for (const courtId of [...new Set(unique.map(s => s.courtId))].sort()) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Court" WHERE id = ${courtId} AND "arenaId" = ${arenaId} AND active = true FOR UPDATE`;
    if (!rows.length) throw new Error("Quadra não encontrada nesta arena.");
  }
  for (const slot of unique) {
    const minute = slot.startsAt.getHours() * 60 + slot.startsAt.getMinutes();
    if ((slot.endsAt.getTime() - slot.startsAt.getTime()) !== arena.scheduleSlotMinutes * 60_000 || minute < arena.scheduleStartMinute || minute + arena.scheduleSlotMinutes > arena.scheduleEndMinute || (minute - arena.scheduleStartMinute) % arena.scheduleSlotMinutes !== 0) throw new Error("Selecione horários pertencentes à grade.");
    const conflict = await tx.scheduleOccurrence.findFirst({ where: { arenaId, ...activeCourtOccurrenceWhere(), startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt }, occurrenceCourts: { some: { courtId: slot.courtId } } }, select: { id: true } });
    if (conflict) throw new Error("Um dos horários foi reservado. Atualize a grade e selecione novamente.");
    await tx.scheduleOccurrence.create({ data: { arenaId, sourceType: "BOOKING", bookingTypeName: "Bloqueio", title: "Horário Bloqueado", startsAt: slot.startsAt, endsAt: slot.endsAt, occurrenceCourts: { create: { courtId: slot.courtId } } } });
  }
}

export async function moveBookingCourt(tx: ArenaTransaction, arenaId: string, occurrenceId: string, courtId: string) {
  const initial = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId }, include: { occurrenceCourts: true } });
  if (!initial) throw new Error("Reserva não encontrada nesta arena.");
  for (const id of [...new Set([courtId, ...initial.occurrenceCourts.map(row => row.courtId)])].sort()) await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${id} AND "arenaId" = ${arenaId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${occurrenceId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const current = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId, status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] }, sourceType: { in: ["BOOKING", "COURT_BOOKING", "ONLINE_BOOKING"] } }, include: { occurrenceCourts: true } });
  if (!current || current.occurrenceCourts.length !== 1) throw new Error("Selecione uma reserva confirmada de uma única quadra.");
  if (current.updatedAt.getTime() !== initial.updatedAt.getTime() || current.occurrenceCourts[0]?.courtId !== initial.occurrenceCourts[0]?.courtId) throw new Error("A reserva foi alterada. Atualize a grade antes de mudar a quadra.");
  const court = await tx.court.findFirst({ where: { id: courtId, arenaId, active: true }, select: { id: true, name: true } });
  if (!court) throw new Error("Quadra não encontrada nesta arena.");
  const services = await tx.scheduleServiceReservation.findMany({ where: { arenaId, occurrenceId }, select: { productId: true } });
  if (services.length) await lockAvailableBookingServices(tx, arenaId, services.map(service => service.productId), current.startsAt, current.endsAt, { courtIds: [courtId], excludeOccurrenceId: occurrenceId, requireVisible: false });
  const conflict = await tx.scheduleOccurrence.findFirst({ where: { arenaId, id: { not: occurrenceId }, ...activeCourtOccurrenceWhere(), startsAt: { lt: current.endsAt }, endsAt: { gt: current.startsAt }, occurrenceCourts: { some: { courtId } } }, select: { id: true } });
  if (conflict) throw new Error("Já existe um agendamento nessa quadra para este horário.");
  await tx.scheduleOccurrence.update({ where: { id: occurrenceId, arenaId }, data: { occurrenceCourts: { deleteMany: {}, create: { courtId } }, updatedAt: new Date() } });
}

export async function releaseBlockedCourtSlot(tx: ArenaTransaction, arenaId: string, occurrenceId: string) {
  await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${occurrenceId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const block = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId, sourceType: "BOOKING", bookingTypeName: "Bloqueio", status: "SCHEDULED", participants: { none: {} }, serviceReservations: { none: {} } }, select: { id: true } });
  if (!block) throw new Error("Bloqueio não encontrado. Atualize a grade.");
  await tx.scheduleOccurrence.update({ where: { id: block.id, arenaId }, data: { status: "CANCELED" } });
}
