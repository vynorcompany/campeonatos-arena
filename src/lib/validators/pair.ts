import { z } from "zod";

export const createTournamentPairSchema = z.object({
  tournamentId: z.string().trim().min(1, "Torneio inválido."),
  playerAId: z.string().trim().min(1, "Selecione o primeiro jogador."),
  playerBId: z.string().trim().min(1, "Selecione o segundo jogador.")
});

export const updateTournamentPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida."),
  playerAId: z.string().trim().min(1, "Selecione o primeiro jogador."),
  playerBId: z.string().trim().min(1, "Selecione o segundo jogador.")
});

export const deleteTournamentPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida.")
});

export const moveTournamentPairGroupSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida."),
  targetGroupId: z.string().trim().min(1, "Grupo de destino inválido.")
});

export const updateTournamentPairPointsSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inv�lida."),
  totalPoints: z.coerce.number().int().min(0, "Pontua��o inv�lida.")
});
