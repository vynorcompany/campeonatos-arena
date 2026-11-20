import "server-only";
import type { Prisma } from "@prisma/client";

export type PortalResultActor = { playerId: string; playerIds: string[] };

// Run inside the same serializable transaction as the result write. A stale
// page must never overwrite a score or authorize a transferred roster.
export async function assertPortalMatchResultAccess(tx: Prisma.TransactionClient, arenaId: string, matchId: string, actor: PortalResultActor) {
  const match = await tx.categoryMatch.findFirst({
    where: { id: matchId, competition: { status: "PUBLISHED", category: { active: true, archivedAt: null, tournament: { arenaId } } } },
    include: { competition: { select: { format: true, isPublic: true } }, homePair: { include: { players: true } }, awayPair: { include: { players: true } } },
  });
  if (!match?.homePair?.active || !match.awayPair?.active) throw new Error("Confronto publicado não disponível nesta arena.");
  if (match.competition.format !== "LEAGUE" && !match.competition.isPublic) throw new Error("Confronto publicado não disponível nesta arena.");
  const roster = [...match.homePair.players, ...(match.competition.format === "LEAGUE" ? [] : match.awayPair.players)];
  if (!roster.some(entry => actor.playerIds.includes(entry.playerId))) {
    throw new Error(match.competition.format === "LEAGUE" ? "Somente a dupla mandante pode registrar este resultado." : "Somente atletas deste confronto podem registrar o resultado.");
  }
  if (match.winnerPairId || match.manualStatus === "FINISHED" || (match.competition.format !== "TRIO" && (match.homeScore !== null || match.awayScore !== null))) {
    throw new Error("Este resultado já foi registrado. Solicite uma correção à arena.");
  }
  return match;
}

export function portalResultError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /^(Confronto publicado |Somente |Este resultado |Este jogo |Informe |Selecione dois |A equipe |Registre os jogos |O terceiro jogo |O mata-mata |Não é possível |O jogo precisa |Defina as duas |Jogo de Liga |Uma dupla |O terceiro set)/.test(message)
    ? message : "Não foi possível salvar o resultado. Tente novamente ou avise a arena.";
}
