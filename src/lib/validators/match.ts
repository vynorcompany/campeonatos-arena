import { z } from "zod";

export const updateMatchCourtSchema = z.object({
  matchId: z.string().min(1),
  courtName: z
    .string()
    .trim()
    .max(40, "Nome da quadra muito longo.")
    .transform((value) => value || null)
    .nullable()
});

export const updateMatchResultSchema = z
  .object({
    matchId: z.string().min(1),
    homeScore: z.coerce.number().int().min(0, "Placar inválido."),
    awayScore: z.coerce.number().int().min(0, "Placar inválido.")
  })
  .refine((data) => data.homeScore !== data.awayScore, {
    message: "O jogo precisa ter um vencedor.",
    path: ["awayScore"]
  });

export const updateMatchParticipantsSchema = z
  .object({
    matchId: z.string().min(1),
    homePairId: z
      .string()
      .trim()
      .transform((value) => value || null)
      .nullable(),
    awayPairId: z
      .string()
      .trim()
      .transform((value) => value || null)
      .nullable()
  })
  .refine((data) => data.homePairId !== data.awayPairId, {
    message: "Selecione duplas diferentes para o confronto.",
    path: ["awayPairId"]
  });
