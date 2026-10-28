"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { withArenaTransaction } from "@/lib/rls";

function refreshClients() {
  revalidatePath("/jogadores");
  revalidatePath("/agenda");
  revalidatePath("/aulas");
}

function moneyToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Math.round((Number(normalized) || 0) * 100);
}

const balanceSchema = z.object({
  playerId: z.string().min(1),
  kind: z.enum(["MONEY", "CLASSES"]),
  operation: z.enum(["ADD", "REMOVE"]),
  amount: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo da movimentação.")
});

export async function adjustClientBalanceAction(formData: FormData) {
  const auth = await requirePermission("players:balance");
  const parsed = balanceSchema.safeParse({ playerId: formData.get("playerId"), kind: formData.get("kind"), operation: formData.get("operation"), amount: formData.get("amount"), reason: formData.get("reason") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Movimentação inválida.");
  const quantity = parsed.data.kind === "MONEY" ? moneyToCents(parsed.data.amount) : Number(parsed.data.amount);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Informe um valor maior que zero.");
  const direction = parsed.data.operation === "ADD" ? 1 : -1;

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const player = await tx.player.findFirst({ where: { id: parsed.data.playerId, arenaId: auth.arenaId }, include: { student: true } });
    if (!player) throw new Error("Cliente não encontrado.");
    if (parsed.data.kind === "CLASSES") {
      const student = player.student ?? await tx.student.create({ data: { arenaId: auth.arenaId, playerId: player.id, name: player.name, phone: player.phone } });
      if (direction < 0 && student.remainingClasses < quantity) throw new Error("O cliente não possui saldo de aulas suficiente.");
      await tx.student.update({ where: { id: student.id }, data: { remainingClasses: { increment: direction * quantity }, ...(direction > 0 ? { totalClasses: { increment: quantity } } : {}) } });
    }
    await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: player.id, kind: parsed.data.kind, amountCents: parsed.data.kind === "MONEY" ? direction * quantity : 0, classesDelta: parsed.data.kind === "CLASSES" ? direction * quantity : 0, reason: parsed.data.reason } });
  });
  refreshClients();
}

export async function mergeClientsAction(formData: FormData) {
  const auth = await requirePermission("players:merge");
  const parsed = z.object({ primaryPlayerId: z.string().min(1), duplicatePlayerId: z.string().min(1) }).safeParse({ primaryPlayerId: formData.get("primaryPlayerId"), duplicatePlayerId: formData.get("duplicatePlayerId") });
  if (!parsed.success || parsed.data.primaryPlayerId === parsed.data.duplicatePlayerId) return { error: "Selecione dois clientes diferentes." };
  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    for (const id of [parsed.data.primaryPlayerId, parsed.data.duplicatePlayerId].sort()) {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Player" WHERE "id" = ${id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      if (!locked.length) return { error: "Cliente não encontrado nesta arena." };
    }
    const clients = await tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: [parsed.data.primaryPlayerId, parsed.data.duplicatePlayerId] } }, include: {
      student: true, account: true, teacher: true,
      _count: { select: {
        entries: true, pairPlayers: true, categoryPairPlayers: true, scheduleParticipants: true,
        notifications: true, portalNotificationReads: true, financialRecurrences: true,
        onlinePaymentCheckouts: true, sponsorships: true, respondedLeagueChallenges: true,
        leagueAthleteTiers: true, createdSuper12Events: true, super12PairPlayers: true,
        whatsAppConversations: true, mergedPlayers: true,
      } },
    } });
    const primary = clients.find((item) => item.id === parsed.data.primaryPlayerId);
    const duplicate = clients.find((item) => item.id === parsed.data.duplicatePlayerId);
    if (!primary || !duplicate) return { error: "Cliente não encontrado." };
    if (!primary.active || !duplicate.active || primary.mergedIntoPlayerId || duplicate.mergedIntoPlayerId) return { error: "Selecione dois clientes ativos que ainda não foram mesclados." };
    if (Object.values(duplicate._count).some((count) => count > 0) || duplicate.teacher || (duplicate.student && primary.student) || (duplicate.account && primary.account)) {
      return { error: "O contato duplicado possui vínculos incompatíveis (torneios, reservas, planos ou acessos ao portal). Tente mantê-lo como cliente principal. Se ambos possuem esses vínculos, a mesclagem exige revisão. Nenhum dado foi alterado." };
    }
    await tx.financialEntry.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    // Fill missing contact details without replacing the selected principal's data.
    await tx.player.update({ where: { id: primary.id }, data: {
      phone: primary.phone || duplicate.phone,
      email: primary.email || duplicate.email,
      cpf: primary.cpf || duplicate.cpf,
      birthDate: primary.birthDate ?? duplicate.birthDate,
    } });
    if (!primary.account && duplicate.account) await tx.playerAccount.update({ where: { playerId: duplicate.id }, data: { playerId: primary.id } });
    await tx.comanda.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    await tx.clientBalanceMovement.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    await tx.loyaltyActivity.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    const duplicateParticipants = await tx.scheduleParticipant.findMany({ where: { playerId: duplicate.id }, select: { id: true, occurrenceId: true } });
    for (const participant of duplicateParticipants) {
      const alreadyPrimary = await tx.scheduleParticipant.findFirst({ where: { occurrenceId: participant.occurrenceId, playerId: primary.id }, select: { id: true } });
      if (alreadyPrimary) await tx.scheduleParticipant.delete({ where: { id: participant.id } });
      else await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { playerId: primary.id } });
    }
    if (duplicate.student && !primary.student) await tx.student.update({ where: { id: duplicate.student.id }, data: { playerId: primary.id, name: primary.name, phone: primary.phone || duplicate.phone } });
    await tx.player.update({ where: { id: duplicate.id }, data: { active: false, mergedIntoPlayerId: primary.id } });
    return { success: true as const };
  });
  if (result.success) refreshClients();
  return result;
}

export async function archiveClientsAction(formData: FormData) {
  const auth = await requirePermission("players:edit");
  const playerIds = [...new Set(formData.getAll("playerId").map(String).filter(Boolean))];
  if (!playerIds.length) throw new Error("Selecione ao menos um cliente.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.player.updateMany({ where: { arenaId: auth.arenaId, id: { in: playerIds } }, data: { active: false } }));
  refreshClients();
}

export async function importClientsAction(formData: FormData) {
  const auth = await requirePermission("players:import");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione um arquivo CSV.");
  const rows = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).map((line) => line.split(";").map((value) => value.trim())).filter(([name]) => name);
  if (!rows.length) throw new Error("O CSV não possui clientes para importar.");
  let imported = 0;
  const existingClients = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({ where: { arenaId: auth.arenaId }, select: { phone: true, cpf: true } }));
  const knownPhones = new Set(existingClients.map((client) => normalizeBrazilianPhone(client.phone)).filter(Boolean));
  const knownCpfs = new Set(existingClients.map((client) => client.cpf.replace(/\D/g, "")).filter(Boolean));
  await withArenaTransaction(auth.arenaId, async (tx) => {
    for (const [name, phone, cpf] of rows) {
      if (name.length < 2 || phone.replace(/\D/g, "").length < 8) continue;
      const normalizedPhone = normalizeBrazilianPhone(phone); const normalizedCpf = cpf.replace(/\D/g, "");
      if (knownPhones.has(normalizedPhone) || (normalizedCpf && knownCpfs.has(normalizedCpf))) continue;
      await tx.player.create({ data: { arenaId: auth.arenaId, name, phone: normalizedPhone, cpf: normalizedCpf } }); imported += 1;
      knownPhones.add(normalizedPhone); if (normalizedCpf) knownCpfs.add(normalizedCpf);
    }
  });
  refreshClients();
  return { imported };
}
