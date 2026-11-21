import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { z } from "zod";
import { CATEGORY_CLASS_OPTIONS, isCategoryGender } from "@/lib/tournament-category/options";

export const newTournamentCategorySchema = z.object({
  tournamentId: z.string().trim().min(1, "Selecione um evento."),
  name: z.string().trim().min(3, "Informe um nome de categoria com pelo menos 3 caracteres."),
  registrationType: z.enum(["PAIR", "TRIO", "INDIVIDUAL"]),
  class: z.string().optional(),
  gender: z.string().trim().toUpperCase().optional(),
  isPublic: z.boolean(),
}).superRefine((input, context) => {
  if (input.registrationType !== "TRIO") return;
  if (!CATEGORY_CLASS_OPTIONS.some(option => option === input.class)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["class"], message: "Selecione a classe do Trio." });
  if (!isCategoryGender(input.gender ?? "")) context.addIssue({ code: z.ZodIssueCode.custom, path: ["gender"], message: "Selecione o gênero do Trio." });
});

export async function createTournamentCategory(arenaId: string, input: z.infer<typeof newTournamentCategorySchema>) {
  return withArenaTransaction(arenaId, async tx => {
    // Serialize category ordering for this event, within the active arena.
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Tournament" WHERE id = ${input.tournamentId} AND "arenaId" = ${arenaId} FOR UPDATE`;
    if (!rows.length) return { error: "Evento não encontrado nesta arena." };
    const tournament = await tx.tournament.findFirst({
      where: { id: input.tournamentId, arenaId },
      select: { id: true, groupCount: true, pairsPerGroup: true, priceFirstCents: true, priceSecondCents: true, priceThirdCents: true, categories: { select: { level: true } } },
    });
    if (!tournament) return { error: "Evento não encontrado nesta arena." };
    const trio = input.registrationType === "TRIO";
    const category = await tx.tournamentCategory.create({
      data: {
        tournamentId: tournament.id,
        name: input.name,
        registrationType: trio ? "PAIR" : input.registrationType,
        level: Math.max(0, ...tournament.categories.map(item => item.level)) + 1,
        groupCount: tournament.groupCount,
        pairsPerGroup: tournament.pairsPerGroup,
        priceFirstCents: tournament.priceFirstCents,
        priceSecondCents: tournament.priceSecondCents,
        priceThirdCents: tournament.priceThirdCents,
        ...(trio ? { class: input.class!, gender: input.gender!, competition: { create: { format: "TRIO", isPublic: input.isPublic } } } : {}),
      },
      select: { id: true },
    });
    return { categoryId: category.id, tournamentId: tournament.id };
  });
}
