"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { GroupEditingError, saveCategoryGroups, saveCategoryGroupsSchema, type SaveCategoryGroupsInput } from "@/lib/services/category-competition/group-editing";

export async function saveCategoryGroupsAction(input: SaveCategoryGroupsInput): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requirePermission("tournaments:manage");
  const parsed = saveCategoryGroupsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Revise a distribuição dos grupos antes de salvar." };
  try {
    await saveCategoryGroups(auth.arenaId, parsed.data, { id: auth.userId, name: auth.userName });
    revalidatePath("/torneios");
    revalidatePath("/torneios/[tournamentId]/categorias/[categoryId]", "page");
    revalidatePath("/classificacao/[arenaSlug]", "page");
    revalidatePath("/jogos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof GroupEditingError ? error.message : "Não foi possível salvar os grupos. Atualize a página e tente novamente." };
  }
}
