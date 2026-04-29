import { z } from "zod";

const courtNames = ["Agecon", "Origem", "Elaine"] as const;

export const updateMatchCourtSchema = z.object({
  matchId: z.string().min(1),
  courtName: z.enum(courtNames, {
    errorMap: () => ({ message: "Selecione uma quadra válida." })
  })
});

export const updateMatchScheduleSchema = z.object({
  matchId: z.string().min(1),
  scheduledTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
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
