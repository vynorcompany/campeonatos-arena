import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3, "Nome do campeonato muito curto."),
  groupCount: z.coerce.number().int().min(1).max(8)
});
