import type { ArenaTransaction } from "@/lib/rls";

type Owner = { arenaId: string; playerId: string };
export async function lockPrivacyOwner(tx: ArenaTransaction, owner: Owner) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Player" WHERE id = ${owner.playerId} AND "arenaId" = ${owner.arenaId} FOR UPDATE`;
  if (rows.length !== 1) throw new Error("Cadastro não encontrado nesta arena.");
}

export async function createPrivacyRequest(tx: ArenaTransaction, owner: Owner, kind: "ERASURE" | "CORRECTION" | "ACCESS" | "OTHER", message: string) {
  await lockPrivacyOwner(tx, owner);
  const existing = await tx.privacyRequest.findFirst({ where: { ...owner, kind, status: "OPEN" }, select: { id: true } });
  if (existing) return { id: existing.id, reused: true };
  const request = await tx.privacyRequest.create({ data: { ...owner, kind, message }, select: { id: true } });
  await tx.arenaNotification.create({ data: { arenaId: owner.arenaId, type: "PRIVACY_REQUEST", title: "Solicitação de dados pessoais", message: "Um cliente enviou uma solicitação de privacidade. Acesse a área restrita para atendê-la.", href: "/configuracoes/privacidade" } });
  return { id: request.id, reused: false };
}

export async function eraseOptionalProfile(tx: ArenaTransaction, owner: Owner) {
  await lockPrivacyOwner(tx, owner);
  await tx.player.update({ where: { id: owner.playerId }, data: {
    photoUrl: "", bio: "", gender: "", birthDate: null, padelSide: "", padelCategories: "[]", class: "", tournamentAvailability: "OFF",
  } });
  await tx.auditEvent.create({ data: { arenaId: owner.arenaId, actorId: owner.playerId, actorName: "Titular dos dados", action: "OPTIONAL_PROFILE_ERASED", entityId: owner.playerId, details: { scope: "optional-profile", financialRecordsPreserved: true } } });
}

export async function exportPrivateProfile(tx: ArenaTransaction, owner: Owner) {
  const profile = await tx.player.findFirstOrThrow({ where: { id: owner.playerId, arenaId: owner.arenaId }, select: {
    name: true, phone: true, email: true, cpf: true, photoUrl: true, bio: true, birthDate: true, gender: true,
    addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true,
    class: true, padelSide: true, padelCategories: true, tournamentAvailability: true, createdAt: true,
  } });
  const account = await tx.playerAccount.findFirst({ where: owner, select: { phone: true, createdAt: true, termsAcceptedAt: true, termsVersion: true, privacyNoticeVersion: true } });
  const requests = await tx.privacyRequest.findMany({ where: owner, orderBy: { createdAt: "desc" }, select: { id: true, kind: true, status: true, message: true, response: true, createdAt: true, resolvedAt: true } });
  // This immediate export intentionally excludes internal notes, credentials and other athletes.
  return { generatedAt: new Date().toISOString(), scope: "Perfil, cadastro de acesso e solicitações nesta arena. Solicite acesso completo aos demais registros pelo formulário de privacidade.", profile, account, requests };
}
