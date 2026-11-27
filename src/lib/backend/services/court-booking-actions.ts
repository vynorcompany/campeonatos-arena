import "server-only";
import { redeemReservationCredit } from "@/lib/plans/reservation-credits";
import { staleRecordMessage } from "@/lib/record-version";
import { lockAvailableBookingServices, BookingServiceUnavailableError } from "@/lib/calendar/booking-services";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { arenaDatabase } from "@/lib/arena-database";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { parseBookingParticipants, parseCourtIds, parseScheduledAt } from "@/lib/calendar/inputs";
import { isFixedBookingType } from "@/lib/calendar/booking-types";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { assertCourtBookingMayBeEdited } from "@/lib/calendar/court-booking-edit-safety";
import { isAgendaManagedBooking } from "@/lib/calendar/agenda-managed-booking";
import { sendBookingConfirmationForOccurrence } from "@/lib/calendar/booking-confirmation-whatsapp";
import { expandWeeklyOccurrences } from "@/lib/scheduling/recurrence";
import { cancelMercadoPagoPayment, getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { boletoCancellationDisposition } from "@/lib/payments/boleto-cancellation";
import { CourtBookingActionResult, courtBookingSchema, visibleCourtBookingErrors } from "@/lib/actions/calendar/shared";

export async function confirmOnlineBookingAction(formData: FormData) {
  const auth = await requirePermission("calendar:booking:edit");
  const occurrenceId = z.string().trim().min(1).safeParse(formData.get("occurrenceId"));
  if (!occurrenceId.success) throw new Error("Reserva inválida.");
  const message = await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${occurrenceId.data} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId.data, arenaId: auth.arenaId, sourceType: "ONLINE_BOOKING", status: "PENDING_CONFIRMATION" }, include: { arena: { select: { slug: true, name: true, onlineBookingWhatsappConfirmationEnabled: true } }, occurrenceCourts: { include: { court: { select: { name: true } } } }, participants: { select: { playerId: true, player: { select: { phone: true } } } } } });
    if (!occurrence) throw new Error("Esta reserva já foi confirmada ou não foi encontrada.");
    await tx.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { status: "SCHEDULED" } });
    if (occurrence.participants.length) {
      const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt);
      await tx.playerNotification.createMany({ data: occurrence.participants.map((participant) => ({ playerId: participant.playerId, type: "ONLINE_BOOKING_CONFIRMED", title: "Reserva confirmada", message: `Sua reserva para ${dateLabel} foi confirmada pela arena. Toque para adicionar ao seu calendário.`, href: `/api/reservar/${occurrence.arena.slug}/${occurrence.id}/calendario` })) });
    }
    const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt);
    return { occurrenceId: occurrence.id, dateLabel, arenaName: occurrence.arena.name, courtName: occurrence.occurrenceCourts[0]?.court.name ?? "Quadra", phones: occurrence.arena.onlineBookingWhatsappConfirmationEnabled ? occurrence.participants.map((item) => item.player.phone).filter(Boolean) : [] };
  });
  await sendBookingConfirmationForOccurrence(auth.arenaId, message.occurrenceId);

}

export async function cancelCourtBookingAction(formData: FormData) {
  const parsed = z.object({ occurrenceId: z.string().trim().min(1), mode: z.enum(["CANCEL", "FREE"]).default("CANCEL"), cancelOpenCharges: z.enum(["yes", "no"]) }).safeParse({ occurrenceId: formData.get("occurrenceId"), mode: formData.get("mode"), cancelOpenCharges: formData.get("cancelOpenCharges") });
  if (!parsed.success) throw new Error("Horário inválido.");
  const auth = await requirePermission(parsed.data.mode === "FREE" ? "calendar:recurrence:release" : "calendar:booking:cancel");
  if(parsed.data.mode === "CANCEL") {
    const linked = await withArenaTransaction(auth.arenaId,tx=>tx.scheduleOccurrence.findFirst({where:{id:parsed.data.occurrenceId,arenaId:auth.arenaId},select:{bookingSeries:{select:{sponsorshipPlanId:true}}}}));
    if(linked?.bookingSeries?.sponsorshipPlanId) return { error: "Encerre o vínculo no menu Planos para revisar também as mensalidades. Para liberar somente este horário, use Liberar horário." };
  }
  const handledPayments = new Set<string>();
  const preservedEntries = new Set<string>();
  if (parsed.data.cancelOpenCharges === "yes") {
    const charges = await withArenaTransaction(auth.arenaId, async (tx) => {
      const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId, status: { not: "CANCELED" } }, select: { id: true, startsAt: true, bookingSeriesId: true, sourceType: true } });
      if (!occurrence) throw new Error("Este horário já foi cancelado ou não foi encontrado.");
      if (!isAgendaManagedBooking(occurrence.sourceType)) throw new Error("Este horário é gerenciado pela origem e não pode ser cancelado pela agenda.");
      const occurrences = parsed.data.mode === "FREE" || !occurrence.bookingSeriesId
        ? [occurrence.id]
        : (await tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, bookingSeriesId: occurrence.bookingSeriesId, startsAt: { gte: occurrence.startsAt }, status: { not: "CANCELED" } }, select: { id: true } })).map((item) => item.id);
      if (await tx.financialEntry.count({where:{arenaId:auth.arenaId,scheduleParticipant:{occurrenceId:{in:occurrences}},reservationSplitParts:{some:{}}}})) throw new Error("Esta reserva foi dividida entre clientes. Concilie as partes no financeiro antes de cancelar cobranças.");
      return tx.financialEntry.findMany({ where: { arenaId: auth.arenaId, source: "SCHEDULE_BOOKING", externalReference: { in: occurrences }, status: "PENDING", settlements: { none: { amountCents: { gt: 0 } } } }, select: { id: true, onlineProvider: true, onlinePaymentId: true, onlinePaymentUrl: true, onlinePaymentClaimMethod: true } });
    });
    if (charges.some((entry) => (entry.onlinePaymentUrl || entry.onlinePaymentClaimMethod) && !entry.onlinePaymentId)) throw new Error("Há uma cobrança online sendo emitida. Aguarde a confirmação antes de cancelar a reserva e a cobrança.");
    const dispositions = new Map<string, ReturnType<typeof boletoCancellationDisposition>>();
    for (const charge of charges) {
      if (!charge.onlinePaymentId) continue;
      if (charge.onlineProvider !== "MERCADO_PAGO") throw new Error("Há uma cobrança emitida por outro provedor. A reserva não foi cancelada.");
      const status = String((await getMercadoPagoPayment(auth.arenaId, charge.onlinePaymentId)).status ?? "");
      const disposition = boletoCancellationDisposition(status);
      if (disposition === "unsupported") throw new Error("Não foi possível confirmar o status de uma cobrança online. A reserva não foi cancelada.");
      dispositions.set(charge.id, disposition);
    }
    for (const charge of charges) {
      if (!charge.onlinePaymentId) continue;
      const disposition = dispositions.get(charge.id);
      if (disposition === "preserve") { preservedEntries.add(charge.id); continue; }
      if (disposition === "cancel") await cancelMercadoPagoPayment(auth.arenaId, charge.onlinePaymentId);
      handledPayments.add(charge.onlinePaymentId);
    }
  }
  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId, status: { not: "CANCELED" } }, select: { id: true, startsAt: true, bookingSeriesId: true, sourceType: true } });
    if (!occurrence) return 0;
    if (!isAgendaManagedBooking(occurrence.sourceType)) throw new Error("Este horário é gerenciado pela origem e não pode ser cancelado pela agenda.");
    const occurrenceIds = parsed.data.mode === "FREE" || !occurrence.bookingSeriesId
      ? [occurrence.id]
      : (await tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, bookingSeriesId: occurrence.bookingSeriesId, startsAt: { gte: occurrence.startsAt }, status: { not: "CANCELED" } }, select: { id: true } })).map((item) => item.id);
    const linkedEntries = await tx.financialEntry.findMany({where:{arenaId:auth.arenaId,scheduleParticipant:{occurrenceId:{in:occurrenceIds}}},select:{id:true}});
    for (const entry of linkedEntries.sort((a,b)=>a.id.localeCompare(b.id))) await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${entry.id} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
    if (await tx.financialEntry.count({where:{arenaId:auth.arenaId,id:{in:linkedEntries.map(entry=>entry.id)},reservationSplitParts:{some:{}}}})) throw new Error("Esta reserva foi dividida entre clientes. Concilie as partes no financeiro antes de cancelar a reserva.");
    if (parsed.data.cancelOpenCharges === "yes") {
      const charges = await tx.financialEntry.findMany({ where: { arenaId: auth.arenaId, source: "SCHEDULE_BOOKING", externalReference: { in: occurrenceIds }, status: "PENDING", settlements: { none: { amountCents: { gt: 0 } } } }, select: { id: true, onlinePaymentId: true, onlinePaymentUrl: true, onlinePaymentClaimMethod: true } });
      if (charges.some((entry) => (entry.onlinePaymentId && !handledPayments.has(entry.onlinePaymentId) && !preservedEntries.has(entry.id)) || ((!entry.onlinePaymentId && (entry.onlinePaymentUrl || entry.onlinePaymentClaimMethod))))) throw new Error("Uma cobrança online mudou durante o cancelamento. Atualize a página e tente novamente.");
      const voidIds = charges.filter((entry) => !preservedEntries.has(entry.id)).map((entry) => entry.id);
      if (voidIds.length) await tx.financialEntry.updateMany({ where: { id: { in: voidIds }, arenaId: auth.arenaId, status: "PENDING", settlements: { none: { amountCents: { gt: 0 } } } }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: `Cobrança em aberto cancelada com a reserva ${occurrence.id}.` } });
    }
    if (parsed.data.mode === "FREE" || !occurrence.bookingSeriesId) {
      return (await tx.scheduleOccurrence.updateMany({ where: { id: occurrence.id, arenaId: auth.arenaId, status: { not: "CANCELED" } }, data: { status: "CANCELED" } })).count;
    }
    await tx.scheduleBookingSeries.updateMany({ where: { id: occurrence.bookingSeriesId, arenaId: auth.arenaId, status: "ACTIVE" }, data: { status: "CANCELED" } });
    return (await tx.scheduleOccurrence.updateMany({ where: { bookingSeriesId: occurrence.bookingSeriesId, arenaId: auth.arenaId, startsAt: { gte: occurrence.startsAt }, status: { not: "CANCELED" } }, data: { status: "CANCELED" } })).count;
  });
  if (!result) throw new Error("Este horário já foi cancelado ou não foi encontrado.");

}

export async function saveCourtBookingAction(formData: FormData): Promise<CourtBookingActionResult> {
  try {
  const parsed = courtBookingSchema.safeParse({
    courtPriceCents: formData.get("courtPriceCents") ?? undefined,
    occurrenceId: String(formData.get("occurrenceId") ?? ""), courtId: formData.get("courtId"), courtIds: formData.get("courtIds"), title: formData.get("title"),
    startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes"), bookingTypeName: formData.get("bookingTypeName"),
    repeatUntil: formData.get("repeatUntil"),
    teacherId: formData.get("teacherId"), responsiblePlayerId: formData.get("responsiblePlayerId"), notes: formData.get("notes"), participants: formData.get("participants")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const expectedVersion = formData.get("expectedUpdatedAt");
  if (parsed.data.occurrenceId && typeof expectedVersion !== "string") return { error: staleRecordMessage };
  let savedVersion: string | undefined;
  const auth = await requirePermission(parsed.data.occurrenceId ? "calendar:booking:edit" : "calendar:booking:create");
  const prisma = arenaDatabase(auth.arenaId);
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const fixedBooking = isFixedBookingType(parsed.data.bookingTypeName);
  const repeatUntil = parsed.data.repeatUntil ? new Date(`${parsed.data.repeatUntil}T23:59:59`) : null;
  if (fixedBooking && !parsed.data.occurrenceId && !repeatUntil) throw new Error("Informe até quando a reserva fixa deve se repetir.");
  if (repeatUntil && (Number.isNaN(repeatUntil.getTime()) || repeatUntil < startsAt)) throw new Error("A data final da reserva fixa deve ser igual ou posterior ao primeiro horário.");
  const occurrenceTimes = fixedBooking && !parsed.data.occurrenceId && repeatUntil
    ? expandWeeklyOccurrences({ startsAt, endsAt, until: repeatUntil })
    : [{ startsAt, endsAt }];
  const participants = parseBookingParticipants(parsed.data.participants);
  if (participants.some(participant => (participant.amountCents > 0 || participant.paymentMethod === "RESERVATION_CREDIT") && participant.paymentMethod)) await requirePermission("finance:receivable:settle");
  if (!participants.length) throw new Error("Selecione pelo menos um cliente antes de salvar a reserva.");
  const responsiblePlayerId = parsed.data.responsiblePlayerId || participants[0]?.playerId || "";
  if (!participants.some((participant) => participant.playerId === responsiblePlayerId)) throw new Error("Selecione um participante como responsável pela reserva.");
  const courtIds = parseCourtIds(parsed.data.courtIds, parsed.data.courtId);
  if (courtIds.length !== 1 && participants.some(p => p.paymentMethod === "RESERVATION_CREDIT")) throw new Error("Um crédito de reserva cobre apenas uma quadra.");
  const courts = await prisma.court.findMany({ where: { arenaId: auth.arenaId, id: { in: courtIds } }, select: { id: true, name: true } });
  if (courts.length !== courtIds.length) throw new Error("Uma ou mais quadras não pertencem à arena.");
  const isLesson = ["aula", "aula fixa"].includes(parsed.data.bookingTypeName.toLowerCase());
  if (isLesson && !parsed.data.teacherId) throw new Error("Selecione o professor responsável.");
  if (parsed.data.teacherId) {
    const teacher = await prisma.teacher.findFirst({ where: { id: parsed.data.teacherId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!teacher) throw new Error("Professor não encontrado.");
  }
  const [players, arena] = await Promise.all([
    participants.length ? withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: participants.map((participant) => participant.playerId) } }, select: { id: true, name: true } })) : [],
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true } })
  ]);
  if (players.length !== participants.length) throw new Error("Um ou mais atletas não pertencem à arena.");
  const bookingTitle = `${parsed.data.bookingTypeName} · ${players.find(player => player.id === responsiblePlayerId)?.name ?? "Cliente"}`;
  const responsibleName = players.find((player) => player.id === responsiblePlayerId)?.name ?? "";
  const courtNames = courts.map((court) => court.name).join(" · ");
  const notificationDates: string[] = [];
  const unpaidParticipantNames = new Set<string>();
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const receivingAccounts = new Map<string, string>();
    for (const participant of participants) {
      if (participant.amountCents > 0 && participant.paymentMethod && !["CREDIT_BALANCE", "RESERVATION_CREDIT"].includes(participant.paymentMethod)) receivingAccounts.set(participant.playerId, await requireReceivingBankAccount(tx, auth.arenaId, participant.bankAccountId));
    }
    for (const courtId of [...courtIds].sort()) {
      const lockedCourt = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Court" WHERE "id" = ${courtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      if (!lockedCourt.length) throw new Error("Quadra não encontrada.");
    }
    if (parsed.data.occurrenceId) {
      await assertCourtBookingMayBeEdited(tx, auth.arenaId, parsed.data.occurrenceId, true, String(expectedVersion));
      const attachedServices = await tx.scheduleServiceReservation.findMany({ where: { arenaId: auth.arenaId, occurrenceId: parsed.data.occurrenceId }, select: { productId: true } });
      if (attachedServices.length) await lockAvailableBookingServices(tx, auth.arenaId, attachedServices.map(service => service.productId), startsAt, endsAt, { excludeOccurrenceId: parsed.data.occurrenceId, requireVisible: false, courtIds });
    }
    const conflict = await tx.scheduleOccurrence.findFirst({ where: {
      arenaId: auth.arenaId, id: parsed.data.occurrenceId ? { not: parsed.data.occurrenceId } : undefined,
      AND: [activeCourtOccurrenceWhere(), { OR: occurrenceTimes.map((occurrence) => ({ startsAt: { lt: occurrence.endsAt }, endsAt: { gt: occurrence.startsAt } })) }],
      occurrenceCourts: { some: { courtId: { in: courtIds } } }
    }, select: { id: true } });
    if (conflict) throw new Error("Já existe um agendamento nessa quadra para este horário.");
    const occurrences = parsed.data.occurrenceId
      ? [await tx.scheduleOccurrence.update({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId }, data: { courtPriceCents: parsed.data.courtPriceCents, title: bookingTitle, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, responsiblePlayerId: responsiblePlayerId || null, notes: parsed.data.notes, occurrenceCourts: { deleteMany: {}, create: courtIds.map((courtId) => ({ courtId })) } } })]
      : await (async () => {
        const series = fixedBooking ? await tx.scheduleBookingSeries.create({ data: { arenaId: auth.arenaId, title: bookingTitle, bookingTypeName: parsed.data.bookingTypeName, startsAt, endsAt: occurrenceTimes.at(-1)!.endsAt, teacherId: parsed.data.teacherId || null, responsiblePlayerId: responsiblePlayerId || null, notes: parsed.data.notes } }) : null;
        return Promise.all(occurrenceTimes.map((occurrence) => tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, sourceType: "BOOKING", courtPriceCents: parsed.data.courtPriceCents, bookingSeriesId: series?.id, title: bookingTitle, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, responsiblePlayerId: responsiblePlayerId || null, notes: parsed.data.notes, occurrenceCourts: { create: courtIds.map((courtId) => ({ courtId })) } } })));
      })();
    if (!parsed.data.occurrenceId) await tx.auditEvent.createMany({ data: occurrences.map(occurrence=>({ arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "booking.created", entityId: occurrence.id, details: { source: "STAFF" } })) });
    savedVersion = occurrences[0]?.updatedAt?.toISOString();
    for (const occurrence of occurrences) {
      const linked = await tx.scheduleParticipant.findMany({ where: { occurrenceId: occurrence.id }, select: { financialEntryId: true } });
      for (const id of linked.map(row => row.financialEntryId).filter((id): id is string => Boolean(id)).sort()) await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const previous = await tx.scheduleParticipant.findMany({ where: { occurrenceId: occurrence.id }, include: { financialEntry: { include: { settlements: true } } } });
      for (const participant of previous) if (!participants.some((item) => item.playerId === participant.playerId) && participant.financialEntryId) {
        const entry = participant.financialEntry;
        if (entry && entry.status !== "PAID" && !entry.paidAt && !entry.settlements.some(row => row.amountCents > 0)) await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Atleta removido da reserva." } });
      }
      await tx.scheduleParticipant.deleteMany({ where: { occurrenceId: occurrence.id, playerId: { notIn: participants.map((participant) => participant.playerId) } } });
      for (const participant of participants) {
        const existing = previous.find((item) => item.playerId === participant.playerId);
        const player = players.find((item) => item.id === participant.playerId)!;
        const oldEntry = existing?.financialEntry;
        const posted = Boolean(oldEntry && (oldEntry.status === "PAID" || oldEntry.paidAt || oldEntry.settlements.some(row => row.amountCents > 0)));
        if (posted && oldEntry!.amountCents !== participant.amountCents) throw new Error("Um valor com recebimento já registrado não pode ser alterado pela grade. Ajuste pelo financeiro.");
        const alreadyPaid = oldEntry?.status === "PAID";
        const paymentMethod = alreadyPaid ? oldEntry.paymentMethod : occurrence === occurrences[0] ? participant.paymentMethod : "";
        const hasCharge = participant.amountCents > 0 || paymentMethod === "RESERVATION_CREDIT";
        if (paymentMethod === "RESERVATION_CREDIT") {
          const services = await tx.scheduleServiceReservation.count({ where: { occurrenceId: occurrence.id } });
          if (services) throw new Error("Receba os serviços separadamente na comanda antes de usar o saldo de reservas.");
          await redeemReservationCredit(tx, auth.arenaId, player.id, occurrence.id, Math.round((occurrence.endsAt.getTime()-occurrence.startsAt.getTime())/60000));
        }
        const date = `${String(occurrence.startsAt.getDate()).padStart(2, "0")}/${String(occurrence.startsAt.getMonth() + 1).padStart(2, "0")}/${occurrence.startsAt.getFullYear()}`;
        const startsAtLabel = `${String(occurrence.startsAt.getHours()).padStart(2, "0")}:${String(occurrence.startsAt.getMinutes()).padStart(2, "0")}`;
        const endsAtLabel = `${String(occurrence.endsAt.getHours()).padStart(2, "0")}:${String(occurrence.endsAt.getMinutes()).padStart(2, "0")}`;
        const responsibleDetail = fixedBooking && responsibleName ? ` · Resp. ${responsibleName}` : "";
        const bankAccountId = alreadyPaid ? oldEntry!.bankAccountId : paymentMethod ? receivingAccounts.get(participant.playerId) ?? null : existing?.financialEntry?.bankAccountId ?? null;
        const paidAt = alreadyPaid ? oldEntry!.paidAt : hasCharge && paymentMethod ? new Date() : null;
        const entryData = { bankAccountId, type: "REVENUE", category: "Reserva", counterpartyName: player.name, playerId: player.id, description: `Reserva · ${date} · ${startsAtLabel}–${endsAtLabel} · ${courtNames}${responsibleDetail}`, amountCents: participant.amountCents, paymentMethod, status: alreadyPaid || paymentMethod ? "PAID" : posted ? "PARTIAL" : "PENDING", dueDate: occurrence.startsAt, paidAt, source: "SCHEDULE_BOOKING", externalReference: occurrence.id, notes: `Agendamento ${occurrence.id}${responsibleName ? ` · Responsável: ${responsibleName}` : ""}`, arenaId: auth.arenaId };
        const financialEntryId = hasCharge ? (existing?.financialEntryId ? (await tx.financialEntry.update({ where: { id: existing.financialEntryId }, data: entryData })).id : (await tx.financialEntry.create({ data: entryData })).id) : null;
        if (financialEntryId && paidAt && !alreadyPaid) {
          const amountCents = Math.max(0, participant.amountCents + (oldEntry?.settlements.reduce((sum, row) => sum + row.interestCents - row.discountCents - row.amountCents, 0) ?? 0));
          if (paymentMethod === "CREDIT_BALANCE" && amountCents) {
            await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${player.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
            const balance = await tx.clientBalanceMovement.aggregate({ where: { arenaId: auth.arenaId, playerId: player.id, kind: "MONEY" }, _sum: { amountCents: true } });
            if ((balance._sum.amountCents ?? 0) < amountCents) throw new Error("Saldo do cliente insuficiente.");
            await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: player.id, kind: "MONEY", amountCents: -amountCents, reason: `Reserva ${occurrence.id}` } });
          }
          if (amountCents) await tx.financialSettlement.create({ data: { arenaId: auth.arenaId, financialEntryId, bankAccountId, amountCents, paymentMethod, paidAt, notes: "Recebimento registrado na Grade de Horários." } });
        }
        if (fixedBooking && responsiblePlayerId && participant.playerId !== responsiblePlayerId && hasCharge && !paymentMethod && (!existing?.financialEntryId || existing.financialEntry?.status === "PAID")) {
          unpaidParticipantNames.add(player.name);
          notificationDates.push(`${date} às ${startsAtLabel}`);
        }
        if (!hasCharge && existing?.financialEntryId && !posted) await tx.financialEntry.update({ where: { id: existing.financialEntryId }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Valor retirado da reserva." } });
        await tx.scheduleParticipant.upsert({ where: { occurrenceId_playerId: { occurrenceId: occurrence.id, playerId: participant.playerId } }, update: { amountCents: participant.amountCents, paymentMethod, financialEntryId }, create: { occurrenceId: occurrence.id, playerId: participant.playerId, amountCents: participant.amountCents, paymentMethod, financialEntryId } });
      }
    }
    if (fixedBooking && responsiblePlayerId && unpaidParticipantNames.size) await tx.playerNotification.create({ data: { playerId: responsiblePlayerId, type: "FIXED_BOOKING_OPEN_BALANCE", title: "Saldo em aberto na reserva fixa", message: `${Array.from(unpaidParticipantNames).join(", ")} ${unpaidParticipantNames.size === 1 ? "está com uma parte em aberto" : "estão com partes em aberto"} na reserva ${courtNames}${notificationDates.length ? ` (${notificationDates.slice(0, 3).join(" · ")}${notificationDates.length > 3 ? "…" : ""})` : ""}.`, href: `/home?arena=${encodeURIComponent(arena.slug)}&section=finance` } });
  });

  return { version: savedVersion };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "";
    if (message === staleRecordMessage || reason instanceof BookingServiceUnavailableError || visibleCourtBookingErrors.has(message)) return { error: message };
    console.error("Falha ao salvar agendamento da grade", reason);
    return { error: "Não foi possível salvar o agendamento. Tente novamente." };
  }
}
