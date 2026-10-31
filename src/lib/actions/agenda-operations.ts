"use server";
import { z } from "zod";
import { BookingServiceUnavailableError } from "@/lib/calendar/booking-services";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { manuallyCheckInParticipant, addOptionalBookingService, removeOptionalBookingService, blockCourtSlots, moveBookingCourt, releaseBlockedCourtSlot } from "@/lib/calendar/staff-operations";
import { refreshCalendarRoutes } from "@/lib/calendar/revalidation";
import { refreshFinanceRoutes } from "@/lib/finance/revalidation";

type AgendaResult = { error?: string; checkedInAt?: string };
const visibleErrors = new Set([
  "Adicione atletas à reserva antes de inserir o serviço.",
  "Revise o pagamento da reserva antes de inserir o serviço.",
  "Serviço indisponível na grade desta arena.",
  "Bloqueio não encontrado. Atualize a grade.",
  "Selecione um atleta desta reserva confirmada.",
  "Este atleta já realizou check-in em outro horário coincidente.",
  "Serviço não encontrado nesta reserva.",
  "Revise o pagamento da reserva antes de remover o serviço.",
  "O valor da reserva precisa de revisão financeira antes de remover este serviço.",
  "Selecione de 1 a 200 horários válidos.",
  "Quadra não encontrada nesta arena.",
  "Selecione horários pertencentes à grade.",
  "Um dos horários foi reservado. Atualize a grade e selecione novamente.",
  "Reserva não encontrada nesta arena.",
  "Selecione uma reserva confirmada de uma única quadra.",
  "A reserva foi alterada. Atualize a grade antes de mudar a quadra.",
  "Já existe um agendamento nessa quadra para este horário.",
  "Este horário é gerenciado pela origem e não pode ser editado pela agenda.",
  "Esta reserva aguarda pagamento e não pode ser editada agora.",
  "Esta reserva já tem pagamento ou cobrança online vinculada. Faça o ajuste financeiro antes de editá-la.",
]);
function actionError(error: unknown, fallback: string): AgendaResult {
  const message = error instanceof Error ? error.message : "";
  return { error: error instanceof BookingServiceUnavailableError || visibleErrors.has(message) ? message : fallback };
}

export async function manualBookingCheckinAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:booking:edit");
  try {
    const input = z.object({ occurrenceId: z.string().min(1), playerId: z.string().min(1) }).parse(Object.fromEntries(form));
    const date = await withArenaTransaction(auth.arenaId, tx => manuallyCheckInParticipant(tx, { ...input, arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName }));
    refreshCalendarRoutes(); return { checkedInAt: date.toISOString() };
  } catch (error) { return actionError(error, "Não foi possível registrar o check-in. Atualize a reserva e tente novamente."); }
}
export async function addBookingServiceAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:booking:edit");
  try {
    const input = z.object({ occurrenceId: z.string().min(1), productId: z.string().min(1) }).parse(Object.fromEntries(form));
    await withArenaTransaction(auth.arenaId, tx => addOptionalBookingService(tx, auth.arenaId, input.occurrenceId, input.productId));
    refreshCalendarRoutes(); refreshFinanceRoutes(); return {};
  } catch (error) { return actionError(error, "Não foi possível inserir o serviço. Confira a disponibilidade e as condições na lista de serviços."); }
}
export async function removeBookingServiceAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:booking:edit");
  try {
    const input = z.object({ occurrenceId: z.string().min(1), serviceId: z.string().min(1) }).parse(Object.fromEntries(form));
    await withArenaTransaction(auth.arenaId, tx => removeOptionalBookingService(tx, auth.arenaId, input.occurrenceId, input.serviceId));
    refreshCalendarRoutes(); refreshFinanceRoutes(); return {};
  } catch (error) { return actionError(error, "Não foi possível remover o serviço. Atualize a reserva e tente novamente."); }
}
export async function blockAgendaSlotsAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:booking:create");
  try {
    const slots = z.array(z.object({ courtId: z.string().min(1), startsAt: z.string().datetime({ local: true }), endsAt: z.string().datetime({ local: true }) })).min(1).max(200).parse(JSON.parse(String(form.get("slots") ?? "[]")));
    await withArenaTransaction(auth.arenaId, tx => blockCourtSlots(tx, auth.arenaId, slots.map(s => ({ courtId: s.courtId, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) }))), { timeout: 20_000 });
    refreshCalendarRoutes(); return {};
  } catch (error) { return actionError(error, "Não foi possível bloquear os horários. Atualize a grade e tente novamente."); }
}
export async function moveBookingCourtAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:booking:edit");
  try {
    const input = z.object({ occurrenceId: z.string().min(1), courtId: z.string().min(1) }).parse(Object.fromEntries(form));
    await withArenaTransaction(auth.arenaId, tx => moveBookingCourt(tx, auth.arenaId, input.occurrenceId, input.courtId));
    refreshCalendarRoutes(); return {};
  } catch (error) { return actionError(error, "Não foi possível mudar a quadra. Atualize a reserva e tente novamente."); }
}

export async function releaseBlockedAgendaSlotAction(form: FormData): Promise<AgendaResult> {
  const auth = await requirePermission("calendar:recurrence:release");
  try {
    const occurrenceId = z.string().min(1).parse(form.get("occurrenceId"));
    await withArenaTransaction(auth.arenaId, tx => releaseBlockedCourtSlot(tx, auth.arenaId, occurrenceId));
    refreshCalendarRoutes(); return {};
  } catch (error) { return actionError(error, "Não foi possível liberar o horário. Atualize a grade e tente novamente."); }
}
