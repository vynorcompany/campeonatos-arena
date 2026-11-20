import "server-only";
import { z } from "zod";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { runSerializableTransaction } from "./shared";

export const knockoutSwapSchema = z.object({
  matchId: z.string().trim().min(1).max(128),
  side: z.enum(["home", "away"]),
  targetMatchId: z.string().trim().min(1).max(128),
  targetSide: z.enum(["home", "away"]),
  expectedPairId: z.string().trim().min(1).max(128),
  expectedTargetPairId: z.string().trim().min(1).max(128),
});
export type KnockoutSwapInput = z.infer<typeof knockoutSwapSchema>;
export class KnockoutSwapError extends Error {}
const phases = ["QUARTERFINAL", "SEMIFINAL", "FINAL"];
const scoreFields = ["homeScore", "awayScore", "homeSet1", "awaySet1", "homeSet2", "awaySet2", "homeSet3", "awaySet3"] as const;

export async function swapKnockoutParticipants(arenaId: string, input: KnockoutSwapInput, actor: { id: string; name: string }) {
  const data = knockoutSwapSchema.parse(input);
  return runSerializableTransaction(arenaId, async tx => {
    const competition = await tx.categoryCompetition.findFirst({
      where: { matches: { some: { id: data.matchId } }, status: "PUBLISHED", format: { not: "LEAGUE" }, category: { active: true, archivedAt: null, tournament: { arenaId, status: { not: "FINISHED" } } } },
      include: { matches: { orderBy: { roundOrder: "asc" }, include: { trioGames: { select: { id: true } }, bookingOccurrences: { where: activeCourtOccurrenceWhere(), select: { id: true } } } } },
    });
    if (!competition) throw new KnockoutSwapError("Confronto indisponível para alteração nesta arena.");
    const source = competition.matches.find(match => match.id === data.matchId);
    const target = competition.matches.find(match => match.id === data.targetMatchId);
    if (!source || !target || !phases.includes(source.stage) || target.stage !== source.stage) throw new KnockoutSwapError("Selecione participantes da mesma fase do mata-mata.");
    if (source.id === target.id && data.side === data.targetSide) throw new KnockoutSwapError("Selecione dois participantes diferentes.");
    const sourceKey = data.side === "home" ? "homePairId" : "awayPairId";
    const targetKey = data.targetSide === "home" ? "homePairId" : "awayPairId";
    const sourcePair = source[sourceKey], targetPair = target[targetKey];
    if (!sourcePair || !targetPair || sourcePair === targetPair || sourcePair !== data.expectedPairId || targetPair !== data.expectedTargetPairId) throw new KnockoutSwapError("O chaveamento foi atualizado. Atualize a página e selecione os participantes novamente.");
    const activePairs = await tx.categoryPair.count({ where: { id: { in: [sourcePair, targetPair] }, competitionId: competition.id, active: true } });
    if (activePairs !== 2) throw new KnockoutSwapError("Uma das equipes não está mais ativa nesta categoria.");
    if (competition.matches.some(match => match.stage === "GROUP" && !match.winnerPairId)) throw new KnockoutSwapError("Conclua a fase de grupos antes de reorganizar o mata-mata.");
    const affected = new Set([source.id, target.id]);
    for (let phase = phases.indexOf(source.stage); phase < phases.length - 1; phase++) {
      const current = competition.matches.filter(match => match.stage === phases[phase]);
      const next = competition.matches.filter(match => match.stage === phases[phase + 1]);
      current.forEach((match, index) => { if (affected.has(match.id) && next[Math.floor(index / 2)]) affected.add(next[Math.floor(index / 2)].id); });
    }
    for (const match of competition.matches.filter(match => affected.has(match.id))) {
      if (match.winnerPairId || ["LIVE", "FINISHED"].includes(match.manualStatus ?? "") || scoreFields.some(field => match[field] !== null) || match.trioGames.length) throw new KnockoutSwapError("Não é possível trocar: este confronto ou uma fase seguinte já possui jogo iniciado ou resultado registrado.");
      if (match.bookingOccurrences.length) throw new KnockoutSwapError("Este confronto ou uma fase seguinte possui reserva vinculada. Desvincule a reserva antes de trocar os participantes.");
    }
    if (source.id === target.id) {
      await tx.categoryMatch.update({ where: { id: source.id }, data: { [sourceKey]: targetPair, [targetKey]: sourcePair } });
    } else {
      await tx.categoryMatch.update({ where: { id: source.id }, data: { [sourceKey]: targetPair } });
      await tx.categoryMatch.update({ where: { id: target.id }, data: { [targetKey]: sourcePair } });
    }
    await tx.auditEvent.create({ data: { arenaId, actorId: actor.id, actorName: actor.name, action: "KNOCKOUT_PARTICIPANTS_SWAPPED", entityId: competition.id, details: { ...data, stage: source.stage } } });
  });
}
