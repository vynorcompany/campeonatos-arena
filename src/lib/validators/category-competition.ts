import { z } from "zod";
import { CATEGORY_CLASS_OPTIONS } from "@/lib/tournament-category/options";
import { categoryMatchManualStatuses } from "@/lib/tournament-category/match-status";

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

const scheduledDateSchema = z.preprocess(
  (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const parsedDate = new Date(Date.UTC(year, month - 1, day));
      return (
        parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day
      );
    }, "Data inválida.")
    .nullable(),
);

const scheduledTimeSchema = z.preprocess(
  (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  },
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
    .nullable(),
);

export const createCategoryCompetitionSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Categoria inválida."),
    class: z.enum(CATEGORY_CLASS_OPTIONS),
    gender: categoryGenderSchema,
    format: z.enum(["LEAGUE", "THREE_GROUPS", "FOUR_GROUPS", "SIMPLE"]),
    leagueTier: z.enum(["A", "B"]).optional(),
    rankingId: nullableIdSchema,
    isPublic: checkboxSchema,
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

export const removeCategoryPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida."),
});

export const generateCategoryDrawSchema = z.object({
  competitionId: competitionIdSchema,
});

export const moveCategoryPairSchema = z.object({
  pairId: z.string().trim().min(1, "Dupla inválida."),
  targetGroupId: z.string().trim().min(1, "Grupo inválido."),
});

export const replaceCategoryPairPlayerSchema = z
  .object({
    pairId: z.string().trim().min(1, "Dupla inválida."),
    previousPlayerId: z.string().trim().min(1, "Atleta atual inválido."),
    replacementPlayerId: z.string().trim().min(1, "Selecione o atleta substituto."),
  })
  .superRefine((value, context) => {
    if (value.previousPlayerId === value.replacementPlayerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione um atleta diferente para a substituição.",
        path: ["replacementPlayerId"],
      });
    }
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

const nullableSetScore = z.preprocess(
  (value) => (String(value ?? "").trim() === "" ? null : value),
  z.coerce.number().int().min(0, "Placar inválido.").nullable(),
);

export const recordCategoryLeagueMatchResultSchema = z
  .object({
    matchId: z.string().trim().min(1, "Jogo inválido."),
    homeSet1: nullableSetScore,
    awaySet1: nullableSetScore,
    homeSet2: nullableSetScore,
    awaySet2: nullableSetScore,
    homeSet3: nullableSetScore,
    awaySet3: nullableSetScore,
  })
  .superRefine((value, context) => {
    const sets = [[value.homeSet1, value.awaySet1], [value.homeSet2, value.awaySet2], [value.homeSet3, value.awaySet3]] as const;
    const firstTwo = sets.slice(0, 2);
    if (firstTwo.some(([home, away]) => home == null || away == null || home === away)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe os dois primeiros sets sem empate.", path: ["awaySet2"] });
      return;
    }
    const homeWins = firstTwo.filter(([home, away]) => home! > away!).length;
    const third = sets[2];
    if (homeWins === 1) {
      if (third[0] == null || third[1] == null || third[0] === third[1]) context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o set de desempate sem empate.", path: ["awaySet3"] });
    } else if (third[0] != null || third[1] != null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "O terceiro set só é usado no desempate.", path: ["homeSet3"] });
    }
  });

export const resetCategoryLeagueMatchResultSchema = z.object({
  matchId: z.string().trim().min(1, "Jogo inválido."),
});

export const categoryMatchStatusSchema = z.enum(categoryMatchManualStatuses);

export const updateCategoryMatchStatusSchema = z.object({
  matchId: z.string().trim().min(1, "Jogo inválido."),
  status: categoryMatchStatusSchema,
});

export const updateCategoryMatchScheduleSchema = z
  .object({
    matchId: z.string().trim().min(1, "Jogo inválido."),
    scheduledDate: scheduledDateSchema,
    scheduledTime: scheduledTimeSchema,
  })
  .superRefine((value, context) => {
    if (Boolean(value.scheduledDate) !== Boolean(value.scheduledTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a data e o horário do jogo.",
        path: value.scheduledDate ? ["scheduledTime"] : ["scheduledDate"],
      });
    }
  });

export const finishCategoryCompetitionSchema = z.object({
  competitionId: competitionIdSchema,
});

export const updateCategoryPublicVisibilitySchema = z.object({
  competitionId: competitionIdSchema,
  isPublic: checkboxSchema,
});
