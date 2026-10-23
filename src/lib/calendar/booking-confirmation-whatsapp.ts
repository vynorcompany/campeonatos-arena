import { withArenaTransaction } from "@/lib/rls";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { bookingConfirmationMessage } from "./booking-confirmation-message";

/** Call only after the transaction that changes the booking to SCHEDULED commits. */
export async function sendBookingConfirmationForOccurrence(arenaId: string, occurrenceId: string) {
  const booking = await withArenaTransaction(arenaId, tx => tx.scheduleOccurrence.findFirst({
    where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING", status: "SCHEDULED" },
    select: { startsAt: true, arena: { select: { name: true, onlineBookingWhatsappConfirmationEnabled: true, onlineBookingWhatsappMessage: true } }, occurrenceCourts: { select: { court: { select: { name: true } } } }, participants: { select: { player: { select: { name: true, phone: true } } } } },
  }));
  if (!booking?.arena.onlineBookingWhatsappConfirmationEnabled) return { sent: 0, failed: 0 };
  const recipients = [...new Map(booking.participants.filter(part => part.player.phone).map(part => [part.player.phone, part.player])).values()];
  const results = await Promise.allSettled(recipients.map(player => sendEvolutionTextMessage(player.phone, bookingConfirmationMessage({ template: booking.arena.onlineBookingWhatsappMessage, clientName: player.name, arenaName: booking.arena.name, courtName: booking.occurrenceCourts.map(item => item.court.name).join(", ") || "Quadra", startsAt: booking.startsAt }), arenaId)));
  const failed = results.filter(result => result.status === "rejected").length;
  if (failed) await withArenaTransaction(arenaId, tx => tx.arenaNotification.create({ data: { arenaId, type: "ONLINE_BOOKING_WHATSAPP_FAILED", title: "Falha no WhatsApp da reserva", message: `A reserva foi confirmada, mas ${failed} mensagem(ns) não foram aceitas pelo WhatsApp. Confira a conexão e contate o cliente.`, href: "/agenda" } }));
  return { sent: results.length - failed, failed };
}
