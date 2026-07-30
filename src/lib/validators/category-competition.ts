import { z } from "zod";
import { CATEGORY_CLASS_OPTIONS } from "@/lib/tournament-category/options";

const competitionIdSchema = z
  .string()
  .trim()
  .min(1, "Competição inválida.");

const nullableIdSchema = z.preprocess(
  (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  },
  z.string().min(1).nullable(),
);

const checkboxSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const categoryGenderSchema = z.preprocess(
  (value) => String(value ?? "").trim().toLocaleUpperCase("pt-BR"),
  z.enum(["FEMININO", "MASCULINO"]),
);

export const createCategoryCompetitionSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Categoria inválida."),
    class: z.enum(CATEGORY_CLASS_OPTIONS),
    gender: categoryGenderSchema,
    format: z.enum(["LEAGUE", "THREE_GROUPS", "FOUR_GROUPS", "SIMPLE"]),
    rankingId: nullableIdSchema,
    feedsGeneralRanking: checkboxSchema,
  })
  .superRefine((value, context) => {
    if (value.feedsGeneralRanking && !value.rankingId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Selecione um ranking de duplas com tabela de pontos para alimentar o Ranking Geral.",
        path: ["rankingId"],
      });
    }
  });

export const addManualPairSchema = z
  .object({
    competitionId: competitionIdSchema,
    firstPlayerId: z.string().trim().min(1, "Selecione o primeiro atleta."),
    secondPlayerId: z.string().trim().min(1, "Selecione o segundo atleta."),
  })
  .superRefine((value, context) => {
    if (value.firstPlayerId === value.secondPlayerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione dois atletas diferentes.",
        path: ["secondPlayerId"],
      });
    }
  });

export const generateCategoryDrawSchema = z.object({
  competitionId: competitionIdSchema,
});

export const moveCategoryPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida."),
  targetGroupId: z.string().trim().min(1, "Grupo inválido."),
});

export const publishCategoryDrawSchema = z.object({
  competitionId: competitionIdSchema,
});

export const recordCategoryMatchResultSchema = z
  .object({
    matchId: z.string().trim().min(1, "Jogo inválido."),
    homeScore: z.coerce.number().int().min(0, "Placar inválido."),
    awayScore: z.coerce.number().int().min(0, "Placar inválido."),
  })
  .superRefine((value, context) => {
    if (value.homeScore === value.awayScore) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O jogo precisa ter uma dupla vencedora.",
        path: ["awayScore"],
      });
    }
  });

export const finishCategoryCompetitionSchema = z.object({
  competitionId: competitionIdSchema,
});
