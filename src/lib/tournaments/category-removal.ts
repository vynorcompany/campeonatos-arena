import type { Prisma } from "@prisma/client";
import { lockTournamentRegistrations } from "@/lib/tournaments/registration-order";

/** Serialize with registration creation; keep all linked records for history/reconciliation. */
export async function archiveTournamentCategory(tx: Prisma.TransactionClient, input: { arenaId: string; tournamentId: string; categoryId: string; confirmed: boolean; expectedRegistrationCount: number; actorId?: string; actorName?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.confirmed) return { ok: false, error: "Confirme a remoção da categoria antes de continuar." };
  await lockTournamentRegistrations(tx, input.tournamentId, input.arenaId);
  const category = await tx.tournamentCategory.findFirst({ where: { id: input.categoryId, tournamentId: input.tournamentId, tournament: { arenaId: input.arenaId } }, select: { id: true, archivedAt: true } });
  if (!category) return { ok: false, error: "Categoria não encontrada nesta arena." };
  if (category.archivedAt) return { ok: true };
  const count = await tx.publicTournamentRegistration.count({ where: { categoryId: category.id } });
  if (count !== input.expectedRegistrationCount) return { ok: false, error: "A quantidade de inscrições mudou. Atualize a página e confira o aviso de remoção novamente." };
  await tx.tournamentCategory.update({ where: { id: category.id }, data: { active: false, archivedAt: new Date() } });
  await tx.auditEvent.create({ data: { arenaId: input.arenaId, actorId: input.actorId ?? "SYSTEM", actorName: input.actorName ?? "Sistema", action: "TOURNAMENT_CATEGORY_REMOVED", entityId: category.id, details: { tournamentId: input.tournamentId, registrationCount: count } } });
  return { ok: true };
}
