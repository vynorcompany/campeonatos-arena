import "server-only";
import { z } from "zod";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { runSerializableTransaction } from "@/lib/services/category-competition/shared";

const groupLayoutSchema = z.array(z.object({ id: z.string().trim().min(1).max(128), pairIds: z.array(z.string().trim().min(1).max(128)).max(256) })).min(1).max(64);
export const saveCategoryGroupsSchema = z.object({
  competitionId: z.string().trim().min(1).max(128),
  expectedGroups: groupLayoutSchema,
  groups: groupLayoutSchema,
});
export type SaveCategoryGroupsInput = z.infer<typeof saveCategoryGroupsSchema>;
export class GroupEditingError extends Error {}
const scoreFields = ["homeScore", "awayScore", "homeSet1", "awaySet1", "homeSet2", "awaySet2", "homeSet3", "awaySet3"] as const;

export async function saveCategoryGroups(arenaId: string, input: SaveCategoryGroupsInput, actor: { id: string; name: string }) {
  const data = saveCategoryGroupsSchema.parse(input);
  return runSerializableTransaction(arenaId, async tx => {
    const competition = await tx.categoryCompetition.findFirst({
      where: { id: data.competitionId, status: { in: ["DRAFT", "PUBLISHED"] }, category: { active: true, archivedAt: null, tournament: { arenaId, status: { not: "FINISHED" } } } },
      include: {
        groups: { orderBy: { drawOrder: "asc" }, include: { pairs: { orderBy: { drawOrder: "asc" }, select: { id: true, active: true } } } },
        pairs: { where: { active: true }, select: { id: true, groupId: true } },
        matches: { include: { trioGames: { select: { id: true } }, bookingOccurrences: { where: activeCourtOccurrenceWhere(), select: { id: true } }, proposals: { select: { id: true } }, challenge: { select: { id: true } } } },
      },
    });
    if (!competition) throw new GroupEditingError("Categoria indisponível para editar grupos nesta arena.");
    if (competition.matches.some(match => match.winnerPairId || match.woReason || ["LIVE", "FINISHED"].includes(match.manualStatus ?? "") || scoreFields.some(field => match[field] !== null) || match.trioGames.length)) {
      throw new GroupEditingError("Os grupos não podem ser alterados: um jogo desta categoria já foi iniciado ou possui resultado registrado.");
    }
    const current = competition.groups.map(group => ({ id: group.id, pairIds: group.pairs.map(pair => pair.id) }));
    if (JSON.stringify(current) !== JSON.stringify(data.expectedGroups)) throw new GroupEditingError("Os grupos foram atualizados por outro usuário. Recarregue a página antes de editar novamente.");
    const groupIds = new Set(data.groups.map(group => group.id));
    const pairIds = data.groups.flatMap(group => group.pairIds);
    const activePairIds = new Set(competition.pairs.map(pair => pair.id));
    if (groupIds.size !== current.length || data.groups.length !== current.length || new Set(pairIds).size !== pairIds.length || pairIds.length !== activePairIds.size || pairIds.some(id => !activePairIds.has(id)) || competition.groups.some(group => group.pairs.some(pair => !pair.active)) || competition.pairs.some(pair => !pair.groupId)) {
      throw new GroupEditingError("Distribuição inválida. Mantenha todas as duplas ou equipes uma única vez nos grupos existentes.");
    }
    const replacements = new Map<string, string>();
    for (const group of current) {
      const next = data.groups.find(item => item.id === group.id);
      if (!next || next.pairIds.length !== group.pairIds.length) throw new GroupEditingError("Troque os participantes de lugar mantendo o tamanho de cada grupo.");
      group.pairIds.forEach((id, index) => replacements.set(id, next.pairIds[index]));
    }
    if (JSON.stringify(current) === JSON.stringify(data.groups)) return;
    // Remap the existing draw slots instead of deleting and rebuilding matches.
    // IDs, court/time, league cycles, blocks and all unrelated metadata survive.
    for (const match of competition.matches) {
      const homePairId = match.homePairId ? replacements.get(match.homePairId) : null;
      const awayPairId = match.awayPairId ? replacements.get(match.awayPairId) : null;
      if (homePairId === undefined || awayPairId === undefined) throw new GroupEditingError("A tabela possui participante fora dos grupos. Revise a distribuição antes de editar.");
      if (homePairId === match.homePairId && awayPairId === match.awayPairId) continue;
      if (match.bookingOccurrences.length || match.proposals.length || match.challenge) throw new GroupEditingError("Um confronto alterado possui reserva, proposta ou desafio vinculado. Desvincule-o antes de trocar seus participantes.");
      await tx.categoryMatch.update({ where: { id: match.id }, data: { homePairId, awayPairId } });
    }
    let drawOrder = 0;
    for (const [index, group] of data.groups.entries()) {
      await tx.categoryGroup.update({ where: { id: group.id }, data: { drawOrder: index + 1 } });
      for (const pairId of group.pairIds) {
        drawOrder++;
        await tx.categoryPair.update({ where: { id: pairId }, data: { groupId: group.id, drawOrder } });
      }
    }
    await tx.categoryCompetition.update({ where: { id: competition.id }, data: { updatedAt: new Date() } });
    await tx.auditEvent.create({ data: { arenaId, actorId: actor.id, actorName: actor.name, action: "CATEGORY_GROUPS_REORDERED", entityId: competition.id, details: { before: current, after: data.groups } } });
  });
}
