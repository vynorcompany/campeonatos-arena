import { z } from "zod";

const rankingRuleFields = {
  championPoints: z.coerce.number().int().min(0).max(5000),
  runnerUpPoints: z.coerce.number().int().min(0).max(5000),
  semifinalPoints: z.coerce.number().int().min(0).max(5000),
  quarterfinalPoints: z.coerce.number().int().min(0).max(5000),
  participationPoints: z.coerce.number().int().min(0).max(5000)
};

export const rankingTypeSchema = z.preprocess(
  (value) => value || "PAIR",
  z.enum(["INDIVIDUAL", "PAIR"])
);

export const generalRankingTypeSchema = z.literal("INDIVIDUAL", {
  errorMap: () => ({
    message: "O Ranking Geral precisa ser individual."
  })
});

export const createRankingProfileSchema = z.object({
  name: z.string().trim().min(3, "Nome do ranking muito curto.").max(80, "Nome do ranking muito longo."),
  description: z.string().trim().max(240, "Descrição do ranking muito longa.").default(""),
  type: rankingTypeSchema.default("PAIR"),
  ...rankingRuleFields
});

export const updateRankingProfileSchema = createRankingProfileSchema.extend({
  rankingId: z.string().trim().min(1, "Ranking inválido.")
});

export const deleteRankingProfileSchema = z.object({
  rankingId: z.string().trim().min(1, "Ranking inválido.")
});
