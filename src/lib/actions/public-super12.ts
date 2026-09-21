"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";

const createSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  name: z.string().trim().min(3, "Dê um nome para o Super 12."),
  format: z.enum(["ROUND_ROBIN", "GROUPS"]),
  groupCount: z.coerce.number().int().min(1).max(12),
  knockoutQualification: z.enum(["TOP_TWO", "TOP_TWO_PLUS_BEST_THIRDS"]),
  pairs: z.string().min(2),
});

function portalPath(arenaSlug: string) {
  return `/classificacao/${arenaSlug}`;
}

export async function createSuper12Action(formData: FormData) {
  const parsed = createSchema.safeParse({
    arenaSlug: formData.get("arenaSlug"), name: formData.get("name"), format: formData.get("format"),
    groupCount: formData.get("groupCount"), knockoutQualification: formData.get("knockoutQualification"), pairs: formData.get("pairs"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do Super 12." };
  let submittedPairs: string[][];
  try { submittedPairs = JSON.parse(parsed.data.pairs); } catch { return { error: "Monte as duplas antes de criar a rodada." }; }
  if (!Array.isArray(submittedPairs) || submittedPairs.length < 2 || submittedPairs.length > 12 || submittedPairs.some((pair) => !Array.isArray(pair) || pair.length !== 2 || pair.some((id) => typeof id !== "string" || !id.trim()))) return { error: "Monte de 2 a 12 duplas, sempre com dois atletas em cada uma." };
  const selectedIds = submittedPairs.flat();
  if (new Set(selectedIds).size !== selectedIds.length) return { error: "Um atleta não pode participar de duas duplas na mesma rodada." };

  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const players = await prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true, id: { in: selectedIds } }, select: { id: true, name: true } });
  if (players.length !== selectedIds.length) return { error: "Um dos atletas selecionados não está mais disponível." };
  const byId = new Map(players.map((player) => [player.id, player]));
  const pairCount = submittedPairs.length;
  const groupCount = parsed.data.format === "GROUPS" ? parsed.data.groupCount : 1;
  if (groupCount > pairCount) return { error: "A quantidade de grupos não pode ser maior que a de duplas." };
  if (parsed.data.format === "GROUPS" && pairCount / groupCount < 2) return { error: "Escolha menos grupos ou mais atletas: cada grupo precisa ter pelo menos duas duplas." };

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.super12Event.create({ data: { arenaId: auth.arenaId, creatorId: auth.playerId, name: parsed.data.name, format: parsed.data.format, groupCount, knockoutQualification: parsed.data.knockoutQualification } });
    const groups = [];
    for (let index = 0; index < groupCount; index += 1) groups.push(await tx.super12Group.create({ data: { eventId: created.id, drawOrder: index + 1, name: groupCount === 1 ? "Todos contra todos" : `Grupo ${String.fromCharCode(65 + index)}` } }));

    const pairs = [];
    for (let index = 0; index < pairCount; index += 1) {
      const [firstId, secondId] = submittedPairs[index]; const first = byId.get(firstId)!; const second = byId.get(secondId)!;
      pairs.push(await tx.super12Pair.create({ data: { eventId: created.id, groupId: groups[index % groupCount].id, drawOrder: index + 1, name: `${first.name} / ${second.name}`, players: { create: [{ playerId: first.id, slot: 1 }, { playerId: second.id, slot: 2 }] } } }));
    }
    let roundOrder = 1;
    for (const group of groups) {
      const groupPairs = pairs.filter((pair) => pair.groupId === group.id);
      for (let home = 0; home < groupPairs.length; home += 1) for (let away = home + 1; away < groupPairs.length; away += 1) {
        await tx.super12Match.create({ data: { eventId: created.id, groupId: group.id, homePairId: groupPairs[home].id, awayPairId: groupPairs[away].id, roundOrder: roundOrder++ } });
      }
    }
    const notificationPlayers = selectedIds.map((id) => byId.get(id)!).filter((player) => player.id !== auth.playerId);
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
