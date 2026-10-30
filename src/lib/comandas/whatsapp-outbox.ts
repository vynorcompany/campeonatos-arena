import type { Prisma } from "@prisma/client";
import { defaultComandaWhatsappPaidMessage, defaultComandaWhatsappUnpaidMessage, comandaWhatsappText } from "./whatsapp-template";
type Settings = { whatsappPaidEnabled: boolean; whatsappUnpaidEnabled: boolean; whatsappMessage: string; whatsappPaidMessage?: string; whatsappUnpaidMessage?: string };
type Part = { playerId: string | null; amountCents: number; outstandingCents: number };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export async function enqueueComandaWhatsapp(tx: Prisma.TransactionClient, arenaId: string, comanda: { id: string; code: string }, settings: Settings, parts: Part[]) {
  const arena = await tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { name: true } });
  const ids: string[] = [];
  for (const part of parts) {
    const kind = part.outstandingCents > 0 ? "UNPAID" : "PAID";
    if (!part.playerId || !(kind === "PAID" ? settings.whatsappPaidEnabled : settings.whatsappUnpaidEnabled)) continue;
    const player = await tx.player.findFirst({ where: { id: part.playerId, arenaId, active: true }, select: { id: true, name: true, phone: true } });
    if (!player?.phone) continue;
    const splitConfigured = Boolean(settings.whatsappPaidMessage?.trim() || settings.whatsappUnpaidMessage?.trim());
    const custom = splitConfigured ? (kind === "PAID" ? settings.whatsappPaidMessage ?? "" : settings.whatsappUnpaidMessage ?? "") : settings.whatsappMessage;
    const template = custom.trim() || (kind === "PAID" ? defaultComandaWhatsappPaidMessage : defaultComandaWhatsappUnpaidMessage);
    const message = comandaWhatsappText(template, { cliente: player.name, comanda: comanda.code, arena: arena.name, total: money(part.amountCents), pendente: money(part.outstandingCents), status: kind === "PAID" ? "Quitada" : "Pagamento pendente" });
    const delivery = await tx.comandaWhatsappDelivery.upsert({ where: { comandaId_playerId_kind: { comandaId: comanda.id, playerId: player.id, kind } }, create: { arenaId, comandaId: comanda.id, playerId: player.id, kind, message }, update: {} });
    if (delivery.status === "PENDING") ids.push(delivery.id);
  }
  return ids;
}
