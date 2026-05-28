import { z } from "zod";

export const createTournamentPairSchema = z.object({
  tournamentId: z.string().trim().min(1, "Torneio invalido."),
  playerAId: z.string().trim().min(1, "Selecione o primeiro jogador."),
  playerBId: z.string().trim().min(1, "Selecione o segundo jogador.")
});

export const updateTournamentPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla invalida."),
  playerAId: z.string().trim().min(1, "Selecione o primeiro jogador."),
  playerBId: z.string().trim().min(1, "Selecione o segundo jogador.")
});

export const deleteTournamentPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla invalida.")
});

export const moveTournamentPairGroupSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla invalida."),
  targetGroupId: z.string().trim().min(1, "Grupo de destino invalido.")
});

export const updateTournamentPairPointsSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla invalida."),
  totalPoints: z.coerce.number().int().min(0, "Pontuacao invalida.")
});
