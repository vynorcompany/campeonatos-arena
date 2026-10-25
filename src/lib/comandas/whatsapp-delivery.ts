import { withArenaTransaction } from "@/lib/rls";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";

/** Claim once. An uncertain provider result is never automatically resent. */
export async function dispatchComandaWhatsapp(arenaId: string, id: string) {
  const claimed = await withArenaTransaction(arenaId, async tx => {
    const result = await tx.comandaWhatsappDelivery.updateMany({ where: { id, arenaId, status: "PENDING" }, data: { status: "SENDING" } });
    if (!result.count) return null;
    const delivery = await tx.comandaWhatsappDelivery.findFirstOrThrow({ where: { id, arenaId } });
    const player = await tx.player.findFirst({ where: { id: delivery.playerId, arenaId, active: true }, select: { phone: true } });
    if (!player?.phone) { await tx.comandaWhatsappDelivery.update({ where: { id }, data: { status: "SKIPPED" } }); return null; }
    return { message: delivery.message, phone: player.phone };
  });
  if (!claimed) return;
  try {
    await sendEvolutionTextMessage(claimed.phone, claimed.message, arenaId, undefined, { signal: AbortSignal.timeout(20_000) });
    await withArenaTransaction(arenaId, tx => tx.comandaWhatsappDelivery.updateMany({ where: { id, arenaId, status: "SENDING" }, data: { status: "SENT", sentAt: new Date() } }));
  } catch {
    await withArenaTransaction(arenaId, async tx => {
      await tx.comandaWhatsappDelivery.updateMany({ where: { id, arenaId, status: "SENDING" }, data: { status: "UNKNOWN" } });
      await tx.arenaNotification.create({ data: { arenaId, type: "COMANDA_WHATSAPP_REVIEW", title: "Confira o WhatsApp da comanda", message: "Não foi possível confirmar o envio de uma mensagem financeira. Confira o WhatsApp antes de enviar novamente.", href: "/financeiro/configuracoes" } });
    }).catch(() => { console.warn("Não foi possível registrar a conferência de mensagem da comanda", id); });
  }
}
