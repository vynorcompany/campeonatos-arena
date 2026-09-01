"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

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
  const auth = await requireModuleEdit("players");
  const parsed = balanceSchema.safeParse({ playerId: formData.get("playerId"), kind: formData.get("kind"), operation: formData.get("operation"), amount: formData.get("amount"), reason: formData.get("reason") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Movimentação inválida.");
  const quantity = parsed.data.kind === "MONEY" ? moneyToCents(parsed.data.amount) : Number(parsed.data.amount);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Informe um valor maior que zero.");
  const direction = parsed.data.operation === "ADD" ? 1 : -1;

  await prisma.$transaction(async (tx) => {
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
  const auth = await requireModuleEdit("players");
  const parsed = z.object({ primaryPlayerId: z.string().min(1), duplicatePlayerId: z.string().min(1) }).safeParse({ primaryPlayerId: formData.get("primaryPlayerId"), duplicatePlayerId: formData.get("duplicatePlayerId") });
  if (!parsed.success || parsed.data.primaryPlayerId === parsed.data.duplicatePlayerId) throw new Error("Selecione dois clientes diferentes.");
  await prisma.$transaction(async (tx) => {
    const clients = await tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: [parsed.data.primaryPlayerId, parsed.data.duplicatePlayerId] } }, include: { student: { include: { subscriptions: true } }, account: true } });
    const primary = clients.find((item) => item.id === parsed.data.primaryPlayerId);
    const duplicate = clients.find((item) => item.id === parsed.data.duplicatePlayerId);
    if (!primary || !duplicate) throw new Error("Cliente não encontrado.");
    if (primary.account && duplicate.account) await tx.playerAccount.delete({ where: { id: duplicate.account.id } });
    if (!primary.account && duplicate.account) await tx.playerAccount.update({ where: { playerId: duplicate.id }, data: { playerId: primary.id } });
    await tx.comanda.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    await tx.clientBalanceMovement.updateMany({ where: { arenaId: auth.arenaId, playerId: duplicate.id }, data: { playerId: primary.id } });
    const duplicateParticipants = await tx.scheduleParticipant.findMany({ where: { playerId: duplicate.id }, select: { id: true, occurrenceId: true } });
    for (const participant of duplicateParticipants) {
      const alreadyPrimary = await tx.scheduleParticipant.findFirst({ where: { occurrenceId: participant.occurrenceId, playerId: primary.id }, select: { id: true } });
      if (alreadyPrimary) await tx.scheduleParticipant.delete({ where: { id: participant.id } });
      else await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { playerId: primary.id } });
    }
    if (duplicate.student && !primary.student) await tx.student.update({ where: { id: duplicate.student.id }, data: { playerId: primary.id, name: primary.name, phone: primary.phone } });
    if (duplicate.student && primary.student) {
      await tx.studentSubscription.updateMany({ where: { studentId: duplicate.student.id }, data: { studentId: primary.student.id } });
      await tx.student.update({ where: { id: primary.student.id }, data: { remainingClasses: { increment: duplicate.student.remainingClasses }, totalClasses: { increment: duplicate.student.totalClasses }, attendedClasses: { increment: duplicate.student.attendedClasses }, missedClasses: { increment: duplicate.student.missedClasses } } });
      await tx.student.delete({ where: { id: duplicate.student.id } });
    }
    await tx.player.update({ where: { id: duplicate.id }, data: { active: false } });
  });
  refreshClients();
}

export async function importClientsAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione um arquivo CSV.");
  const rows = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).map((line) => line.split(";").map((value) => value.trim())).filter(([name]) => name);
  if (!rows.length) throw new Error("O CSV não possui clientes para importar.");
  let imported = 0;
  await prisma.$transaction(async (tx) => {
    for (const [name, phone, cpf] of rows) {
      if (name.length < 2 || phone.replace(/\D/g, "").length < 8) continue;
      const normalizedPhone = phone.replace(/\D/g, ""); const normalizedCpf = cpf.replace(/\D/g, "");
      const existing = await tx.player.findFirst({ where: { arenaId: auth.arenaId, OR: [{ phone: normalizedPhone }, ...(normalizedCpf ? [{ cpf: normalizedCpf }] : [])] }, select: { id: true } });
      if (existing) continue;
      await tx.player.create({ data: { arenaId: auth.arenaId, name, phone: normalizedPhone, cpf: normalizedCpf } }); imported += 1;
    }
  });
  refreshClients();
  return { imported };
}
