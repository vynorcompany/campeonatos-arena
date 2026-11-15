"use server";
import { boletoPayerDocument } from "@/lib/payments/boleto-payer";
import { courtRulesForDate } from "@/lib/calendar/date-availability";
import { servicePermitsDuration } from "@/lib/calendar/service-booking-rules";
import { lockAvailableBookingServices, BookingServiceUnavailableError } from "@/lib/calendar/booking-services";
import { arenaDatabase } from "@/lib/arena-database";
import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { parseScheduledAt } from "@/lib/calendar/inputs";
import { calculateCourtIntervalPrice, isCourtBookingStartOnGrid } from "@/lib/calendar/court-interval-pricing";
import { activeCourtOccurrenceWhere, onlineBookingPixExpiration } from "@/lib/calendar/online-booking-hold";
import { arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { getBookingDelinquency } from "@/lib/calendar/booking-delinquency";
import { cancelUnpaidOnlineBooking, claimOnlineBookingPaymentMethod } from "@/lib/calendar/booking-payment-claim";
import { sendBookingConfirmationForOccurrence } from "@/lib/calendar/booking-confirmation-whatsapp";
import { arenaBookingPath } from "@/lib/arena-booking-path";
import { createBoletoPayment, createCardCheckout, createPixPayment, getMissingBoletoPayerFields } from "@/lib/payments/mercado-pago";
import { PublicBookingConflictError, PublicCourtBookingActionResult, publicBookingCancellationSchema, publicBookingPaymentSchema, publicCourtBookingSchema, refreshCalendar } from "@/lib/actions/calendar/shared";

export async function createPublicCourtBookingAction(formData: FormData): Promise<PublicCourtBookingActionResult> {
  const parsed = publicCourtBookingSchema.safeParse({
    matchId: formData.get("matchId") || undefined, arenaSlug: formData.get("arenaSlug"), courtId: formData.get("courtId"), startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes"), serviceIds: formData.getAll("serviceIds"), quotedTotalCents: formData.get("quotedTotalCents") || undefined
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const playerAuth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true, slug: true, scheduleStartMinute: true, scheduleEndMinute: true, onlineBookingEnabled: true, onlineBookingRequiresConfirmation: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingOverdueBlockDays: true } });
  if (!arena) throw new Error("Arena não encontrada.");
  if (!arena.onlineBookingEnabled) throw new Error("A reserva online está desabilitada pela arena.");
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const earliestStart = new Date(Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000);
  if (arenaWallClockToInstant(startsAt).getTime() < earliestStart.getTime()) throw new Error(`Este horário exige antecedência mínima de ${arena.onlineBookingLeadTimeMinutes} minutos.`);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const startsAtMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endsAtMinute = endsAt.getHours() * 60 + endsAt.getMinutes();
  const court = await arenaDatabase(arena.id).court.findFirst({ where: { id: parsed.data.courtId, arenaId: arena.id, active: true }, include: { weeklyRules: true } });
  if (!court) throw new Error("Quadra não encontrada.");

  if (!isCourtBookingStartOnGrid(startsAtMinute, arena.scheduleStartMinute, arena.scheduleEndMinute, court.onlineSlotMinutes)) throw new Error("Este horário não pertence à grade de reservas da quadra.");
  if (parsed.data.durationMinutes % court.onlineSlotMinutes !== 0) throw new Error("A duração deve respeitar o intervalo configurado para a quadra.");
  const bookingAmountCents = calculateCourtIntervalPrice({ startsAtMinute, durationMinutes: parsed.data.durationMinutes, intervalMinutes: court.onlineSlotMinutes, weekday: startsAt.getDay(), rules: courtRulesForDate(court.weeklyRules, court.dateAvailability, startsAt, true) });
  if (bookingAmountCents === null) throw new Error("Este horário não está disponível para reserva online.");
  let requiresPayment = false;
  let onlineBooking: { occurrenceId: string; playerEmail: string | null };
  try {
    onlineBooking = await withArenaTransaction(arena.id, async (tx) => {
      // Serializa reservas da mesma quadra antes de consultar a disponibilidade.
      const lockedCourt = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Court" WHERE "id" = ${court.id} AND "arenaId" = ${arena.id} FOR UPDATE`;
      if (!lockedCourt.length) throw new PublicBookingConflictError("Quadra não encontrada.");
      const conflict = await tx.scheduleOccurrence.findFirst({ where: { arenaId: arena.id, ...activeCourtOccurrenceWhere(), startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId: court.id } } }, select: { id: true } });
      if (conflict) throw new PublicBookingConflictError("Este horário acabou de ser reservado. Selecione outro horário.");
      let matchBooking: { id: string; title: string; playerIds: string[] } | null = null;
      if (parsed.data.matchId) {
        // Serialize the same match even when requests select different courts.
        await tx.$queryRaw`SELECT "id" FROM "CategoryMatch" WHERE "id" = ${parsed.data.matchId} FOR UPDATE`;
        const match = await tx.categoryMatch.findFirst({ where: { id: parsed.data.matchId, competition: { status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } }, include: { homePair: { include: { players: true } }, awayPair: { include: { players: true } } } });
        const playerIds = [...new Set([...(match?.homePair?.players ?? []), ...(match?.awayPair?.players ?? [])].map(entry => entry.playerId))];
        if (!match?.homePair || !match.awayPair || !playerIds.includes(playerAuth.playerId) || match.manualStatus === "FINISHED" || match.winnerPairId || (match.homeScore !== null && match.awayScore !== null)) throw new PublicBookingConflictError("Este confronto não está disponível para agendamento.");
        const validPlayers = await tx.player.count({ where: { id: { in: playerIds }, arenaId: arena.id, active: true } });
        if (validPlayers !== playerIds.length) throw new PublicBookingConflictError("Os atletas do confronto precisam estar ativos nesta arena.");
        const existing = await tx.scheduleOccurrence.findFirst({ where: { arenaId: arena.id, categoryMatchId: match.id, ...activeCourtOccurrenceWhere() }, select: { id: true } });
        if (existing) throw new PublicBookingConflictError("Este confronto já possui uma reserva. Consulte a equipe para alterá-la.");
        matchBooking = { id: match.id, title: `${match.homePair.name} × ${match.awayPair.name}`, playerIds };
      }
      const services = parsed.data.serviceIds.length ? await lockAvailableBookingServices(tx, arena.id, parsed.data.serviceIds, startsAt, endsAt, { courtIds: [court.id] }) : [];
      if (parsed.data.durationMinutes > Math.max(...court.onlineDurationMinutes) || !servicePermitsDuration(court.onlineDurationMinutes, parsed.data.durationMinutes, services, court.id, startsAt.getDay(), startsAtMinute, court.onlineSlotMinutes)) throw new PublicBookingConflictError("Esta duração exige um serviço compatível selecionado. Confira as condições da reserva.");
      const totalAmountCents = bookingAmountCents + services.reduce((sum, service) => sum + service.priceCents, 0);
      if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents > 2_147_483_647) throw new PublicBookingConflictError("O valor total da reserva está acima do limite permitido.");
      if ((services.length && parsed.data.quotedTotalCents === undefined) || (parsed.data.quotedTotalCents !== undefined && parsed.data.quotedTotalCents !== totalAmountCents)) throw new PublicBookingConflictError("O valor da reserva foi atualizado. Atualize a página e confira os valores antes de reservar.");
      requiresPayment = arena.onlineBookingPaymentEnabled && totalAmountCents > 0;
      const player = await tx.player.findFirst({ where: { id: playerAuth.playerId, arenaId: arena.id, active: true }, select: { id: true, name: true, email: true } });
      if (!player) throw new Error("Cliente não encontrado.");
      const delinquency = await getBookingDelinquency(tx, arena.id, player.id, arena.onlineBookingOverdueBlockDays);
      if (delinquency.blocked) throw new PublicBookingConflictError(delinquency.requiresReview ? `Entre em contato com a recepção para revisar seu cadastro antes de reservar. Protocolo: ${delinquency.reviewReference}.` : "Há pagamentos em atraso. Regularize suas pendências na área financeira para voltar a reservar.");
      if (requiresPayment && !player.email) throw new Error("Informe seu e-mail no perfil para continuar com o pagamento online.");
      const occurrence = await tx.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "ONLINE_BOOKING", responsiblePlayerId: player.id, categoryMatchId: matchBooking?.id, title: matchBooking?.title ?? `${player.name} - Reserva`, startsAt, endsAt, status: requiresPayment ? "PENDING_PAYMENT" : arena.onlineBookingRequiresConfirmation ? "PENDING_CONFIRMATION" : "SCHEDULED", bookingTypeName: "Reserva", occurrenceCourts: { create: { courtId: court.id } }, participants: { create: (matchBooking?.playerIds ?? [player.id]).map(playerId => ({ playerId, amountCents: playerId === player.id ? totalAmountCents : 0 })) }, ...(services.length ? { serviceReservations: { create: services.map(({ rules: _rules, ...service }) => service) } } : {}) } });
      await tx.auditEvent.create({ data: { arenaId: arena.id, actorId: player.id, actorName: player.name, action: "booking.created", entityId: occurrence.id, details: { source: "PORTAL" } } });
      const localDate = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;
      await tx.arenaNotification.create({ data: { arenaId: arena.id, title: requiresPayment ? "Reserva aguardando pagamento" : arena.onlineBookingRequiresConfirmation ? "Reserva aguardando confirmação" : "Nova reserva online", message: `${player.name} solicitou ${court.name} às ${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}.`, href: `/agenda?data=${localDate}#reserva-${occurrence.id}`, type: "ONLINE_BOOKING" } });
      return { occurrenceId: occurrence.id, playerEmail: player.email };
    });
  } catch (error) {
    if (error instanceof PublicBookingConflictError || error instanceof BookingServiceUnavailableError) return { ok: false, error: error.message };
    throw error;
  }
  if (!requiresPayment && !arena.onlineBookingRequiresConfirmation) await sendBookingConfirmationForOccurrence(arena.id, onlineBooking.occurrenceId);
  const checkoutUrl = requiresPayment ? `/reservar/${arena.slug}/pagamento/${onlineBooking.occurrenceId}` : "";
  revalidatePath("/agenda");
  revalidatePath(`/reservar/${arena.slug}`);
  revalidatePath(`/classificacao/${arena.slug}`);
  revalidatePath(arenaBookingPath(arena.slug));
  return {
    ok: true,
    checkoutUrl,
    occurrenceId: onlineBooking.occurrenceId,
    calendarUrl: `/api/reservar/${arena.slug}/${onlineBooking.occurrenceId}/calendario`,
    reservationStatus: requiresPayment ? "PENDING_PAYMENT" : arena.onlineBookingRequiresConfirmation ? "PENDING_CONFIRMATION" : "SCHEDULED"
  };
}

export async function cancelPublicCourtBookingRequestAction(formData: FormData) {
  const parsed = publicBookingCancellationSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), occurrenceId: formData.get("occurrenceId") });
  if (!parsed.success) throw new Error("Solicitação de reserva inválida.");
  const playerAuth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true, slug: true } });
  if (!arena) throw new Error("Arena não encontrada.");
  const cancelled = await withArenaTransaction(arena.id, (tx) => cancelUnpaidOnlineBooking(tx, {
    arenaId: arena.id, occurrenceId: parsed.data.occurrenceId, playerId: playerAuth.playerId,
  }));
  if (!cancelled.count) throw new Error("Esta solicitação não pode mais ser cancelada. Se você iniciou o pagamento, aguarde a confirmação ou o fim do prazo de 15 minutos.");
  refreshCalendar();
  revalidatePath(`/reservar/${arena.slug}`);
  revalidatePath(`/classificacao/${arena.slug}`);
  revalidatePath(arenaBookingPath(arena.slug));
}

export async function startPublicCourtBookingPaymentAction(formData: FormData) {
  const parsed = publicBookingPaymentSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), occurrenceId: formData.get("occurrenceId"), method: formData.get("method") });
  if (!parsed.success) throw new Error("Dados do pagamento inválidos.");
  const playerAuth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) throw new Error("Arena não encontrada.");
  const booking = await withArenaTransaction(arena.id, (tx) => claimOnlineBookingPaymentMethod(tx, {
    arenaId: arena.id,
    occurrenceId: parsed.data.occurrenceId,
    playerId: playerAuth.playerId,
    method: parsed.data.method,
  }));
  const participant = booking?.participants[0];
  if (!booking || !participant) throw new Error("O prazo de 15 minutos desta reserva terminou. Escolha novamente o horário disponível.");
  if (!participant.player.email) throw new Error("Informe seu e-mail no perfil para continuar com o pagamento online.");
  const paymentInput = { arenaId: arena.id, amountCents: participant.amountCents, description: `Reserva de quadra · ${booking.occurrenceCourts[0]?.court.name ?? "Quadra"}`, payerEmail: participant.player.email, externalReference: `online_booking:${booking.id}` };
  const payment = parsed.data.method === "PIX" ? await createPixPayment({ ...paymentInput, expiresAt: onlineBookingPixExpiration(booking.createdAt) }) : parsed.data.method === "CARD" ? await createCardCheckout(paymentInput) : await (async () => { const missing = getMissingBoletoPayerFields(participant.player); if (missing.length) throw new Error(`Para emitir boleto, complete no perfil: ${missing.join(", ")}.`); return createBoletoPayment({ ...paymentInput, payerCpf: boletoPayerDocument(participant.player), payerName: participant.player.name, payerAddress: participant.player, expiresAt: new Date(booking.createdAt.getTime() + 3 * 24 * 60 * 60_000) }); })();
  if (!payment.checkoutUrl) throw new Error("Não foi possível abrir o pagamento escolhido.");
  return { checkoutUrl: payment.checkoutUrl };
}
