import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { ArenaTransaction } from "@/lib/rls";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { getOutstandingCents } from "@/lib/finance/settlements";

export function protectedContactHash(arenaId: string, phone: string, secret = process.env.PRIVACY_CONTACT_HASH_KEY?.trim() || process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY) {
  if (!secret || secret.trim().length < 32) throw new Error("A revisão de cadastros requer uma chave de proteção configurada no servidor.");
  const normalized = normalizeBrazilianPhone(phone);
  if (!/^\d{10,13}$/.test(normalized)) throw new Error("Este contato precisa de revisão da arena antes do encerramento.");
  return createHmac("sha256", secret.trim()).update(JSON.stringify(["arena-retained-contact-v1", arenaId, normalized])).digest("hex");
}

export function ownedReceivables(arenaId: string, playerIds: string[]): Prisma.FinancialEntryWhereInput {
  return { arenaId, type: { in: ["REVENUE", "INCOME"] }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, OR: [
    { playerId: { in: playerIds } }, { sale: { comanda: { playerId: { in: playerIds } } } },
    { scheduleParticipant: { playerId: { in: playerIds } } }, { recurrence: { playerId: { in: playerIds } } },
    { onlinePaymentItems: { some: { checkout: { playerId: { in: playerIds } } } } },
  ] };
}

export async function hasRetainedObligations(tx: ArenaTransaction, arenaId: string, playerId: string) {
  const entries = await tx.financialEntry.findMany({ where: ownedReceivables(arenaId, [playerId]), select: { amountCents: true, settlements: { select: { amountCents: true, interestCents: true } } } });
  if (entries.some(entry => getOutstandingCents(entry.amountCents, entry.settlements) > 0)) return true;
  if (await tx.comanda.findFirst({ where: { arenaId, playerId, status: "OPEN" }, select: { id: true } })) return true;
  if (await tx.financialRecurrence.findFirst({ where: { arenaId, active: true, type: { in: ["REVENUE", "INCOME"] }, OR: [{ playerId }, { student: { playerId } }] }, select: { id: true } })) return true;
  if (await tx.studentSubscription.findFirst({ where: { arenaId, status: "ACTIVE", student: { playerId } }, select: { id: true } })) return true;
  if (await tx.onlinePaymentCheckout.findFirst({ where: { arenaId, playerId, status: { in: ["PENDING", "REVIEW"] } }, select: { id: true } })) return true;
  const wallet = await tx.clientBalanceMovement.aggregate({ where: { arenaId, playerId }, _sum: { amountCents: true } });
  return (wallet._sum.amountCents ?? 0) !== 0;
}

export async function retainContactForObligations(tx: ArenaTransaction, arenaId: string, playerId: string, phone: string) {
  if (!await hasRetainedObligations(tx, arenaId, playerId)) return false;
  const contactHash = protectedContactHash(arenaId, phone);
  await tx.erasedContactReference.upsert({ where: { arenaId_playerId_contactHash: { arenaId, playerId, contactHash } }, create: { arenaId, playerId, contactHash }, update: {} });
  return true;
}

/** Returns only a review flag, never another profile's debt, name or credentials. */
export async function retainedContactNeedsReview(tx: ArenaTransaction, arenaId: string, playerId: string, overdueCutoff: Date) {
  if (!await tx.erasedContactReference.findFirst({ where: { arenaId }, select: { id: true } })) return null;
  const player = await tx.player.findFirst({ where: { id: playerId, arenaId }, select: { phone: true, account: { select: { phone: true, identity: { select: { phone: true } } } } } });
  const phone = player?.account?.identity?.phone ?? player?.account?.phone ?? player?.phone;
  if (!phone) return null;
  const contactHash = protectedContactHash(arenaId, phone);
  const references = await tx.erasedContactReference.findMany({ where: { arenaId, contactHash, playerId: { not: playerId } }, select: { id: true, playerId: true } });
  let reviewReference: string | null = null;
  for (const reference of references) {
    if (!await hasRetainedObligations(tx, arenaId, reference.playerId)) {
      await tx.erasedContactReference.deleteMany({ where: { id: reference.id, arenaId } });
      continue;
    }
    const debts = await tx.financialEntry.findMany({ where: { ...ownedReceivables(arenaId, [reference.playerId]), dueDate: { lt: overdueCutoff } }, select: { amountCents: true, settlements: { select: { amountCents: true, interestCents: true } } } });
    if (debts.some(debt => getOutstandingCents(debt.amountCents, debt.settlements) > 0)) reviewReference ??= reference.id;
  }
  return reviewReference;
}
