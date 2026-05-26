import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3, "Nome do campeonato muito curto."),
  description: z.string().trim().default(""),
  publicSlug: z
    .string()
    .trim()
    .min(3, "Informe um slug com pelo menos 3 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen no link público."),
  registrationPhase: z.enum(["REGISTRATIONS", "EDITING", "LIVE", "FINISHED"]).default("REGISTRATIONS"),
  groupCount: z.coerce.number().int().min(1).max(8),
  pairsPerGroup: z.coerce.number().int().min(2).max(16),
  priceFirstCents: z.coerce.number().int().min(0),
  priceSecondCents: z.coerce.number().int().min(0),
  priceThirdCents: z.coerce.number().int().min(0),
  blockCategoryGap: z.coerce.boolean().default(false),
  maxCategoryGap: z.coerce.number().int().min(1).max(5).default(1),
  categoryList: z.string().trim().min(1, "Informe ao menos uma categoria."),
  rankingId: z.string().trim().default("")
});

export const updateTournamentSchema = createTournamentSchema.extend({
  tournamentId: z.string().min(1, "Torneio inválido.")
});
