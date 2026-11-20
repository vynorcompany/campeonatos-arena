"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { knockoutSwapSchema, KnockoutSwapError, swapKnockoutParticipants, type KnockoutSwapInput } from "@/lib/services/category-competition/knockout-reordering";

export async function swapKnockoutParticipantsAction(input: KnockoutSwapInput): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requirePermission("tournaments:manage");
  const parsed = knockoutSwapSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Selecione os dois participantes que deseja trocar." };
  try {
    await swapKnockoutParticipants(auth.arenaId, parsed.data, { id: auth.userId, name: auth.userName });
    revalidatePath("/torneios");
    revalidatePath("/torneios/[tournamentId]/categorias/[categoryId]", "page");
    revalidatePath("/classificacao/[arenaSlug]", "page");
    revalidatePath("/jogos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof KnockoutSwapError ? error.message : "Não foi possível trocar os participantes. Atualize a página e tente novamente." };
  }
}
