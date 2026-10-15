"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit, requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { loadClientLoyalty } from "@/lib/services/client-loyalty";

const playerIdSchema = z.string().trim().min(1);

export async function updateClientLoyaltySettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = z.object({
    visitsRequired: z.coerce.number().int().min(1).max(1000),
    rewardLabel: z.string().trim().min(2, "Descreva a recompensa.").max(120),
  }).safeParse({ visitsRequired: formData.get("visitsRequired"), rewardLabel: formData.get("rewardLabel") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Configuração inválida.");
  const enabled = formData.get("enabled") === "on";
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const current = await tx.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { loyaltyEnabled: true } });
    await tx.arena.update({ where: { id: auth.arenaId }, data: {
      loyaltyEnabled: enabled,
      loyaltyVisitsRequired: parsed.data.visitsRequired,
      loyaltyRewardLabel: parsed.data.rewardLabel,
      ...(!current.loyaltyEnabled && enabled ? { loyaltyStartedAt: new Date() } : {}),
    } });
  });
  revalidatePath("/jogadores");
}

export async function getClientLoyaltyAction(playerId: string) {
  const auth = await requireModuleView("players");
  const id = playerIdSchema.parse(playerId);
  const result = await withArenaTransaction(auth.arenaId, (tx) => loadClientLoyalty(tx, auth.arenaId, id));
  return { ...result, settings: { ...result.settings, loyaltyStartedAt: result.settings.loyaltyStartedAt?.toISOString() ?? null }, activities: result.activities.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), fulfilledAt: item.fulfilledAt?.toISOString() ?? null })) };
}

export async function recordClientVisitAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = z.object({ playerId: playerIdSchema, notes: z.string().trim().max(200) }).safeParse({ playerId: formData.get("playerId"), notes: formData.get("notes") ?? "" });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Visita inválida.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const state = await loadClientLoyalty(tx, auth.arenaId, parsed.data.playerId);
    if (!state.settings.loyaltyEnabled || !state.player.active) throw new Error("A fidelidade não está ativa para este cliente.");
    await tx.loyaltyActivity.create({ data: { arenaId: auth.arenaId, playerId: state.player.id, kind: "VISIT", visitsDelta: 1, notes: parsed.data.notes, createdByUserId: auth.userId } });
  });
  revalidatePath("/jogadores");
}

export async function redeemClientLoyaltyAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const playerId = playerIdSchema.parse(formData.get("playerId"));
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Player" WHERE "id" = ${playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    if (!locked.length) throw new Error("Cliente não encontrado nesta arena.");
    const state = await loadClientLoyalty(tx, auth.arenaId, playerId);
    if (!state.settings.loyaltyEnabled || !state.player.active) throw new Error("A fidelidade não está ativa para este cliente.");
    if (!state.availableRewards) throw new Error("O cliente ainda não atingiu o número de visitas necessário.");
    await tx.loyaltyActivity.create({ data: { arenaId: auth.arenaId, playerId, kind: "REWARD", visitsDelta: -state.settings.loyaltyVisitsRequired, rewardLabel: state.settings.loyaltyRewardLabel, createdByUserId: auth.userId } });
  });
  revalidatePath("/jogadores");
}

export async function fulfillClientLoyaltyRewardAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const activityId = z.string().trim().min(1).parse(formData.get("activityId"));
  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.loyaltyActivity.updateMany({ where: { id: activityId, arenaId: auth.arenaId, kind: "REWARD", fulfilledAt: null }, data: { fulfilledAt: new Date(), fulfilledByUserId: auth.userId } }));
  if (!updated.count) throw new Error("Recompensa não encontrada ou já entregue.");
  revalidatePath("/jogadores");
}
