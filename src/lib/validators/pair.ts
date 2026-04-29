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
