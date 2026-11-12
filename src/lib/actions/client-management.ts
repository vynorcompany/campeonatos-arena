"use server";
import { ClientMergeConflict, transferClientHistory } from "@/lib/clients/merge-history";
import { changeLessonCredits } from "@/lib/academy/lesson-credits";

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
      await changeLessonCredits(tx,auth.arenaId,student.id,direction*quantity);
    }
    await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: player.id, kind: parsed.data.kind, amountCents: parsed.data.kind === "MONEY" ? direction * quantity : 0, classesDelta: parsed.data.kind === "CLASSES" ? direction * quantity : 0, reason: parsed.data.reason } });
  });
  refreshClients();
}

export async function mergeClientsAction(formData: FormData) {
  const auth = await requirePermission("players:merge");
  const parsed = z.object({ primaryPlayerId: z.string().min(1), duplicatePlayerId: z.string().min(1) }).safeParse({ primaryPlayerId: formData.get("primaryPlayerId"), duplicatePlayerId: formData.get("duplicatePlayerId") });
  if (!parsed.success || parsed.data.primaryPlayerId === parsed.data.duplicatePlayerId) return { error: "Selecione dois clientes diferentes." };
  let result;
  try { result = await withArenaTransaction(auth.arenaId, async (tx) => {
    for (const id of [parsed.data.primaryPlayerId, parsed.data.duplicatePlayerId].sort()) {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Player" WHERE "id" = ${id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      if (!locked.length) return { error: "Cliente não encontrado nesta arena." };
    }
    const clients = await tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: [parsed.data.primaryPlayerId, parsed.data.duplicatePlayerId] } }, include: {
      student: true, account: true, teacher: true,
      _count: { select: {
        entries: true, pairPlayers: true, categoryPairPlayers: true, scheduleParticipants: true,
        notifications: true, portalNotificationReads: true, financialRecurrences: true,
        onlinePaymentCheckouts: true, sponsorships: true, dependents:true, billedEntries:true, respondedLeagueChallenges: true,
        leagueAthleteTiers: true, createdSuper12Events: true, super12PairPlayers: true,
        whatsAppConversations: true, mergedPlayers: true,
      } },
    } });
    const primary = clients.find((item) => item.id === parsed.data.primaryPlayerId);
    const duplicate = clients.find((item) => item.id === parsed.data.duplicatePlayerId);
    if (!primary || !duplicate) return { error: "Cliente não encontrado." };
    if (!primary.active || !duplicate.active || primary.mergedIntoPlayerId || duplicate.mergedIntoPlayerId) return { error: "Selecione dois clientes ativos que ainda não foram mesclados." };
    if (primary.personType !== duplicate.personType) return { error: "Os cadastros são de tipos diferentes (pessoa física e jurídica). Corrija o tipo antes de mesclar." };
    if (primary.cnpj && duplicate.cnpj && primary.cnpj !== duplicate.cnpj) return { error: "Os cadastros possuem CNPJs diferentes. Confira as empresas antes de mesclar." };
    await transferClientHistory(tx, auth.arenaId, primary, duplicate);
    // Fill missing contact details without replacing the selected principal's data.
    await tx.player.update({ where: { id: primary.id }, data: {
      phone: primary.phone || duplicate.phone,
      email: primary.email || duplicate.email,
      cpf: primary.cpf || duplicate.cpf,
      cnpj: primary.cnpj || duplicate.cnpj, allowOverdueComandas: primary.allowOverdueComandas ?? duplicate.allowOverdueComandas,
      birthDate: primary.birthDate ?? duplicate.birthDate,
      guardianId: primary.guardianId ?? duplicate.guardianId,
      ...Object.fromEntries(["addressZipCode","addressStreet","addressNumber","addressNeighborhood","addressCity","addressState","photoUrl","bio"].map(field=>[field,(primary as any)[field] || (duplicate as any)[field]])),
    } });
    if (duplicate.student && !primary.student) await tx.student.update({ where: { id: duplicate.student.id }, data: { playerId: primary.id, name: primary.name, phone: primary.phone || duplicate.phone } });
    await tx.comandaWhatsappDelivery.updateMany({where:{arenaId:auth.arenaId,playerId:duplicate.id},data:{playerId:primary.id}});
    await tx.checkinRecord.updateMany({where:{arenaId:auth.arenaId,playerId:duplicate.id},data:{playerId:primary.id}});
    await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId ?? "SYSTEM",actorName:auth.userName ?? "Operador",action:"CLIENT_MERGED",entityId:primary.id,details:JSON.parse(JSON.stringify({primaryId:primary.id,duplicateId:duplicate.id,previousStudent:duplicate.student,previousCounts:duplicate._count}))}});
    await tx.player.update({ where: { id: duplicate.id }, data: { active: false, mergedIntoPlayerId: primary.id } });
    return { success: true as const };
  }, { timeout: 60_000 });
  } catch(error) { if(error instanceof ClientMergeConflict)return {error:error.message}; throw error; }
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
  const existingClients = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({ where: { arenaId: auth.arenaId }, select: { phone: true, cpf: true, cnpj: true } }));
  const knownPhones = new Set(existingClients.map((client) => normalizeBrazilianPhone(client.phone)).filter(Boolean));
  const knownCpfs = new Set(existingClients.flatMap((client) => [client.cpf,client.cnpj]).map(value=>value?.replace(/[.\/\-\s]/g, "").toUpperCase()).filter(Boolean));
  await withArenaTransaction(auth.arenaId, async (tx) => {
    for (const [name, phone, cpf] of rows) {
      if (name.length < 2 || phone.replace(/\D/g, "").length < 8) continue;
      const normalizedPhone = normalizeBrazilianPhone(phone); const document = (cpf??"").replace(/[.\/\-\s]/g, "").toUpperCase();
      if (document && !/^\d{11}$/.test(document) && !/^[A-Z0-9]{12}\d{2}$/.test(document)) continue;
      const company=document.length===14; const normalizedCpf=company?"":document;
      if (knownPhones.has(normalizedPhone) || (document && knownCpfs.has(document))) continue;
      await tx.player.create({ data: { arenaId: auth.arenaId, name, phone: normalizedPhone, cpf: normalizedCpf, personType:company?"PJ":"PF", cnpj:company?document:"" } }); imported += 1;
      knownPhones.add(normalizedPhone); if (document) knownCpfs.add(document);
    }
  });
  refreshClients();
  return { imported };
}
