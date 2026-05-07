import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3, "Nome do campeonato muito curto."),
  groupCount: z.coerce.number().int().min(1).max(8),
  pairsPerGroup: z.coerce.number().int().min(2).max(16),
  rankingId: z.string().trim().default("")
});

export const updateTournamentSchema = createTournamentSchema.extend({
  tournamentId: z.string().min(1, "Torneio inválido.")
});
