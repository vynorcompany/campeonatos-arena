import type { z } from "zod";
import type { LeagueMatchResultActionState } from "./league-match-result-state";
import { recordCategoryLeagueMatchResultSchema } from "@/lib/validators/category-competition";

export type LeagueMatchResultInput = z.infer<
  typeof recordCategoryLeagueMatchResultSchema
>;

export function parseLeagueMatchResultInput(
  formData: FormData,
): LeagueMatchResultInput | LeagueMatchResultActionState {
  const parsed = recordCategoryLeagueMatchResultSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  return parsed.data;
}
