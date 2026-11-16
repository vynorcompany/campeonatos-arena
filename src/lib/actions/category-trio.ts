"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { recordCategoryTrioGame } from "@/lib/services/category-trio";
import { z } from "zod";

const inputSchema = z.object({
  matchId: z.string().trim().min(1).max(128), gameNumber: z.coerce.number().int().min(1).max(3),
  homePlayerIds: z.array(z.string().trim().min(1).max(128)).length(2), awayPlayerIds: z.array(z.string().trim().min(1).max(128)).length(2),
  homeScore: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().int().min(0).max(99)),
  awayScore: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().int().min(0).max(99)),
});
export async function recordCategoryTrioGameAction(_previous: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const auth = await requirePermission("tournaments:results");
  const parsed = inputSchema.safeParse({ matchId: formData.get("matchId"), gameNumber: formData.get("gameNumber"), homePlayerIds: formData.getAll("homePlayerIds"), awayPlayerIds: formData.getAll("awayPlayerIds"), homeScore: formData.get("homeScore"), awayScore: formData.get("awayScore") });
  if (!parsed.success) return { error: "Selecione dois atletas de cada equipe e informe o placar do jogo." };
  try {
    const { matchId, ...input } = parsed.data;
    await recordCategoryTrioGame(auth.arenaId, matchId, input, { id: auth.userId, name: auth.userName });
    revalidatePath("/torneios"); revalidatePath("/torneios/[tournamentId]/categorias/[categoryId]", "page");
    revalidatePath("/classificacao/[arenaSlug]", "page"); revalidatePath("/jogos");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message && !/Prisma|Invalid|constraint|SQL|query|transaction/i.test(message)) return { error: message };
    return { error: "Não foi possível salvar o jogo. Atualize o confronto e confira as formações." };
  }
}
