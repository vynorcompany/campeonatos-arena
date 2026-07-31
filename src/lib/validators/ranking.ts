import { z } from "zod";

const rankingPointSchema = z.coerce.number().int().min(0).max(5000);
const optionalRankingPointSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  rankingPointSchema.optional(),
);

const rankingRuleBlueprints = {
  LEAGUE: [
    {
      stageKey: "CHAMPION",
      label: "1º lugar",
      displayOrder: 1,
      field: "championPoints",
    },
    {
      stageKey: "RUNNER_UP",
      label: "2º lugar",
      displayOrder: 2,
      field: "runnerUpPoints",
    },
    {
      stageKey: "THIRD",
      label: "3º lugar",
      displayOrder: 3,
      field: "thirdPoints",
    },
    {
      stageKey: "PARTICIPATION",
      label: "Participação",
      displayOrder: 4,
      field: "participationPoints",
    },
  ],
  KNOCKOUT: [
    {
      stageKey: "CHAMPION",
      label: "1º lugar",
      displayOrder: 1,
      field: "championPoints",
    },
    {
      stageKey: "RUNNER_UP",
      label: "2º lugar",
      displayOrder: 2,
      field: "runnerUpPoints",
    },
    {
      stageKey: "SEMIFINAL",
      label: "Semifinal",
      displayOrder: 3,
      field: "semifinalPoints",
    },
    {
      stageKey: "QUARTERFINAL",
      label: "Quartas de final",
      displayOrder: 4,
      field: "quarterfinalPoints",
    },
    {
      stageKey: "PARTICIPATION",
      label: "Participação",
      displayOrder: 5,
      field: "participationPoints",
    },
  ],
} as const;

export const rankingTypeSchema = z.preprocess(
  (value) => value || "PAIR",
  z.enum(["INDIVIDUAL", "PAIR"]),
);

export const rankingModelSchema = z.preprocess(
  (value) => value || "KNOCKOUT",
  z.enum(["LEAGUE", "KNOCKOUT"]),
);

export type RankingModel = z.infer<typeof rankingModelSchema>;

export function getRankingRuleBlueprint(model: RankingModel) {
  return rankingRuleBlueprints[model];
}

export const generalRankingTypeSchema = z.literal("INDIVIDUAL", {
  errorMap: () => ({
    message: "O Ranking Geral precisa ser individual.",
  }),
});

export const createRankingProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nome do ranking muito curto.")
      .max(80, "Nome do ranking muito longo."),
    description: z
      .string()
      .trim()
      .max(240, "Descrição do ranking muito longa.")
      .default(""),
    type: rankingTypeSchema.default("PAIR"),
    model: rankingModelSchema.default("KNOCKOUT"),
    isGeneral: z.boolean().default(false),
    championPoints: optionalRankingPointSchema,
    runnerUpPoints: optionalRankingPointSchema,
    thirdPoints: optionalRankingPointSchema,
    semifinalPoints: optionalRankingPointSchema,
    quarterfinalPoints: optionalRankingPointSchema,
    participationPoints: optionalRankingPointSchema,
  })
  .superRefine((ranking, context) => {
    if (ranking.isGeneral && ranking.type !== "INDIVIDUAL") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isGeneral"],
        message: "O Ranking Geral precisa ser individual.",
      });
    }

    for (const rule of getRankingRuleBlueprint(ranking.model)) {
      if (ranking[rule.field] === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [rule.field],
          message: `Informe os pontos para ${rule.label}.`,
        });
      }
    }
  });

export const updateRankingProfileSchema = z.intersection(
  createRankingProfileSchema,
  z.object({
    rankingId: z.string().trim().min(1, "Ranking inválido."),
  }),
);

export const deleteRankingProfileSchema = z.object({
  rankingId: z.string().trim().min(1, "Ranking inválido."),
});
