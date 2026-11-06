import type { Prisma } from "@prisma/client";
import { instantToArenaWallClock } from "../calendar/arena-wall-clock";
import { checkinGameWhere, gameCheckinPath } from "./game";

export async function shareCheckinGame(tx: Prisma.TransactionClient, input: { arenaId: string; playerId: string; arenaSlug: string; occurrenceId: string }, now = new Date()) {
  const arena = await tx.arena.findUnique({ where: { id: input.arenaId }, select: { checkinEnabled: true, checkinToken: true } });
  if (!arena?.checkinEnabled || !arena.checkinToken) return { error: "O check-in da arena está desativado. Procure a recepção." };
  const game = await tx.scheduleOccurrence.findFirst({ where: { id: input.occurrenceId, arenaId: input.arenaId, responsiblePlayerId: input.playerId, status: "SCHEDULED", ...checkinGameWhere }, select: { id: true, endsAt: true } });
  if (!game) return { error: "Somente o responsável pode compartilhar uma reserva confirmada." };
  if (game.endsAt <= instantToArenaWallClock(now)) return { error: "Este jogo já terminou." };
  return { path: gameCheckinPath(input.arenaSlug, arena.checkinToken, game.id) };
}
