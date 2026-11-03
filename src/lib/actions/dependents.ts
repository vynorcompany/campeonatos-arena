"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { validateGuardian } from "@/lib/clients/dependents";
export async function createDependentAction(form: FormData) {
    const auth = await requirePermission("players:edit");
    const name = String(form.get("name") ?? "").trim();
    const guardianId = String(form.get("guardianId") ?? "").trim();
    const birth = String(form.get("birthDate") ?? "");
    if (name.length < 3 || name.length > 120 || !guardianId)
        return { error: "Informe o nome do dependente e o responsável." };
    const birthDate = birth ? new Date(`${birth}T12:00:00Z`) : null;
    if (birthDate && (Number.isNaN(birthDate.getTime()) || birthDate > new Date()))
        return { error: "Informe uma data de nascimento válida." };
    try { await withArenaTransaction(auth.arenaId, async (tx) => {
        await validateGuardian(tx, auth.arenaId, guardianId);
        const duplicate = await tx.player.findFirst({ where: { arenaId: auth.arenaId, guardianId, name: { equals: name, mode: "insensitive" }, birthDate, mergedIntoPlayerId: null }, select: { id: true } });
        if (duplicate) throw new Error("Já existe um dependente com este nome e nascimento para este responsável. Abra o cadastro existente.");
        const player = await tx.player.create({ data: { arenaId: auth.arenaId, name, guardianId, birthDate } });
        await tx.student.create({ data: { arenaId: auth.arenaId, playerId: player.id, name } });
    });
    } catch(error) { return {error: error instanceof Error && !error.name.startsWith("Prisma") ? error.message : "Não foi possível cadastrar o dependente. Confira os dados e tente novamente."}; }
    revalidatePath("/jogadores");
    revalidatePath("/aulas");
    return { success: true };
}
