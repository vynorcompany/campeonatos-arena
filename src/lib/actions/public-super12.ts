"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";

const createSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  name: z.string().trim().min(3, "Dê um nome para o Super 12."),
  format: z.enum(["ROUND_ROBIN", "GROUPS"]),
  groupCount: z.coerce.number().int().min(2).max(3),
  playerIds: z.array(z.string().trim().min(1)),
});

function portalPath(arenaSlug: string) {
  return `/classificacao/${arenaSlug}`;
}

export async function createSuper12Action(formData: FormData) {
  const parsed = createSchema.safeParse({
    arenaSlug: formData.get("arenaSlug"), name: formData.get("name"), format: formData.get("format"),
    groupCount: formData.get("groupCount"), playerIds: formData.getAll("playerIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do Super 12." };
  const selectedIds = [...new Set(parsed.data.playerIds)];
  if (selectedIds.length < 4 || selectedIds.length > 24 || selectedIds.length % 2 !== 0) return { error: "Selecione de 4 a 24 atletas, sempre em número par, para formar até 12 duplas." };

  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const players = await prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true, id: { in: selectedIds } }, select: { id: true, name: true } });
  if (players.length !== selectedIds.length) return { error: "Um dos atletas selecionados não está mais disponível." };
  const byId = new Map(players.map((player) => [player.id, player]));
  const orderedPlayers = selectedIds.map((id) => byId.get(id)!);
  const pairCount = orderedPlayers.length / 2;
  const groupCount = parsed.data.format === "GROUPS" ? Math.min(parsed.data.groupCount, pairCount) : 1;
  if (parsed.data.format === "GROUPS" && pairCount / groupCount < 2) return { error: "Escolha menos grupos ou mais atletas: cada grupo precisa ter pelo menos duas duplas." };

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.super12Event.create({ data: { arenaId: auth.arenaId, creatorId: auth.playerId, name: parsed.data.name, format: parsed.data.format, groupCount } });
    const groups = [];
    for (let index = 0; index < groupCount; index += 1) groups.push(await tx.super12Group.create({ data: { eventId: created.id, drawOrder: index + 1, name: groupCount === 1 ? "Todos contra todos" : `Grupo ${String.fromCharCode(65 + index)}` } }));

    const pairs = [];
    for (let index = 0; index < pairCount; index += 1) {
      const first = orderedPlayers[index * 2]; const second = orderedPlayers[index * 2 + 1];
      pairs.push(await tx.super12Pair.create({ data: { eventId: created.id, groupId: groups[index % groupCount].id, drawOrder: index + 1, name: `${first.name} / ${second.name}`, players: { create: [{ playerId: first.id, slot: 1 }, { playerId: second.id, slot: 2 }] } } }));
    }
    let roundOrder = 1;
    for (const group of groups) {
      const groupPairs = pairs.filter((pair) => pair.groupId === group.id);
      for (let home = 0; home < groupPairs.length; home += 1) for (let away = home + 1; away < groupPairs.length; away += 1) {
        await tx.super12Match.create({ data: { eventId: created.id, groupId: group.id, homePairId: groupPairs[home].id, awayPairId: groupPairs[away].id, roundOrder: roundOrder++ } });
      }
    }
    const notificationPlayers = orderedPlayers.filter((player) => player.id !== auth.playerId);
    if (notificationPlayers.length) await tx.playerNotification.createMany({ data: notificationPlayers.map((player) => ({ playerId: player.id, type: "SUPER12", title: "Você entrou em um Super 12 🎾", message: `${auth.name} montou ${created.name}. Acompanhe os jogos e a classificação pelo Portal.`, href: `${portalPath(parsed.data.arenaSlug)}?section=leagues&eventTab=super12&super12=${created.id}` })) });
    return created;
  });
  revalidatePath(portalPath(parsed.data.arenaSlug));
  return { error: null, eventId: event.id };
}

const scoreValue = z.string().trim().regex(/^\d+$/, "Informe o placar das duas duplas.").transform(Number).pipe(z.number().int().min(0).max(99));
const scoreSchema = z.object({ arenaSlug: z.string().trim().min(1), matchId: z.string().trim().min(1), homeScore: scoreValue, awayScore: scoreValue });

export async function recordSuper12ScoreAction(formData: FormData) {
  const parsed = scoreSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), matchId: formData.get("matchId"), homeScore: formData.get("homeScore"), awayScore: formData.get("awayScore") });
  if (!parsed.success) return { error: "Informe placares válidos." };
  if (parsed.data.homeScore === parsed.data.awayScore) return { error: "Uma partida de padel precisa ter uma dupla vencedora." };
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const match = await prisma.super12Match.findFirst({ where: { id: parsed.data.matchId, event: { arenaId: auth.arenaId, creatorId: auth.playerId, status: "ACTIVE" } }, select: { id: true } });
  if (!match) return { error: "Somente quem criou este Super 12 pode lançar placares." };
  await prisma.super12Match.update({ where: { id: match.id }, data: { homeScore: parsed.data.homeScore, awayScore: parsed.data.awayScore } });
  revalidatePath(portalPath(parsed.data.arenaSlug));
  return { error: null };
}

export async function finishSuper12Action(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? ""); const eventId = String(formData.get("eventId") ?? "");
  if (!arenaSlug || !eventId) return { error: "Não foi possível identificar o Super 12." };
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const event = await prisma.super12Event.findFirst({ where: { id: eventId, arenaId: auth.arenaId, creatorId: auth.playerId, status: "ACTIVE" }, select: { id: true } });
  if (!event) return { error: "Somente quem criou este Super 12 pode encerrá-lo." };
  await prisma.super12Event.update({ where: { id: event.id }, data: { status: "FINISHED" } });
  revalidatePath(portalPath(arenaSlug));
  return { error: null };
}
