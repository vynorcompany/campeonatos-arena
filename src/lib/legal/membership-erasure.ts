import type { ArenaTransaction } from "@/lib/rls";
import { lockPrivacyOwner } from "./privacy-service";
import { retainContactForObligations } from "./retained-contact";

const removedName = "Atleta removido";
export const erasureRetentionNotice = "O acesso e os dados cadastrais deste vínculo foram removidos. Resultados esportivos permanecem com identificação substituída. Registros financeiros, fiscais, de contratos, auditoria e cópias de segurança podem ser conservados para obrigações legais e exercício de direitos, com acesso restrito. Reservas, contratos e débitos não são cancelados por esta operação. Para revisar dados conservados ou registros sem vínculo inequívoco, contate a arena com este protocolo. Dados em provedores externos seguem o atendimento e os prazos desses provedores.";

async function eraseLinkedProfile(tx: ArenaTransaction, owner: { arenaId: string; playerId: string }, phone: string) {
  await lockPrivacyOwner(tx, owner);
  const player = await tx.player.findFirstOrThrow({ where: { id: owner.playerId, arenaId: owner.arenaId }, select: { cpf: true } });
  const contactRetained = await retainContactForObligations(tx, owner.arenaId, owner.playerId, phone);

  await tx.player.update({ where: { id: owner.playerId }, data: {
    name: removedName, active: false, phone: "", email: "", cpf: "", photoUrl: "", bio: "", gender: "", birthDate: null,
    addressZipCode: "", addressStreet: "", addressNumber: "", addressNeighborhood: "", addressCity: "", addressState: "",
    padelSide: "", padelCategories: "[]", class: "", tournamentAvailability: "OFF",
  } });
  await tx.$executeRaw`UPDATE "Player" SET notes = '' WHERE id = ${owner.playerId} AND "arenaId" = ${owner.arenaId}`;
  const staffName = `Cadastro removido (${owner.playerId})`;
  await tx.student.updateMany({ where: { arenaId: owner.arenaId, playerId: owner.playerId }, data: { name: staffName, phone: "", email: "", notes: "", active: false } });
  await tx.teacher.updateMany({ where: { arenaId: owner.arenaId, playerId: owner.playerId }, data: { name: staffName, phone: "", email: "", notes: "", active: false } });

  const pairPlayers = { where: { player: { arenaId: owner.arenaId } }, orderBy: { slot: "asc" as const }, select: { player: { select: { name: true } } } };
  const pairs = await tx.pair.findMany({ where: { tournament: { arenaId: owner.arenaId }, players: { some: { playerId: owner.playerId } } }, select: { id: true, players: pairPlayers } });
  for (const pair of pairs) await tx.pair.update({ where: { id: pair.id }, data: { name: pair.players.map(row => row.player.name).join(" / ") } });
  const categoryPairs = await tx.categoryPair.findMany({ where: { competition: { category: { tournament: { arenaId: owner.arenaId } } }, players: { some: { playerId: owner.playerId } } }, select: { id: true, players: pairPlayers } });
  for (const pair of categoryPairs) await tx.categoryPair.update({ where: { id: pair.id }, data: { name: pair.players.map(row => row.player.name).join(" / ") } });
  const superPairs = await tx.super12Pair.findMany({ where: { event: { arenaId: owner.arenaId }, players: { some: { playerId: owner.playerId } } }, select: { id: true, players: pairPlayers } });
  for (const pair of superPairs) await tx.super12Pair.update({ where: { id: pair.id }, data: { name: pair.players.map(row => row.player.name).join(" / ") } });
  const ownCompetition = { pair: { competition: { category: { tournament: { arenaId: owner.arenaId } } } } };
  await tx.categoryPairSubstitution.updateMany({ where: { ...ownCompetition, previousPlayerId: owner.playerId }, data: { previousPlayerName: removedName } });
  await tx.categoryPairSubstitution.updateMany({ where: { ...ownCompetition, replacementPlayerId: owner.playerId }, data: { replacementPlayerName: removedName } });
  await tx.leagueMedicalSubstitutionRequest.updateMany({ where: { ...ownCompetition, previousPlayerId: owner.playerId }, data: { reason: "Informação pessoal removida a pedido do titular.", reviewNotes: "" } });

  // CPF identifies legacy registrations; ambiguous or unlinked records require human review.
  // Do not infer ownership from a shared phone or a similar name.
  if (player.cpf && await tx.player.count({ where: { arenaId: owner.arenaId, cpf: player.cpf, id: { not: owner.playerId } } }) === 0) {
    const tournament = { arenaId: owner.arenaId };
    await tx.publicTournamentRegistration.updateMany({ where: { tournament, leadCpf: player.cpf }, data: { leadName: removedName, leadPhone: "", leadBirthDate: null } });
    await tx.publicTournamentRegistration.updateMany({ where: { tournament, partnerCpf: player.cpf }, data: { partnerName: removedName, partnerPhone: "", partnerBirthDate: null } });
    // Keep a financial registration's tax identity for the arena's retention review.
    const noFinancialRecord = { amountCents: 0, paymentReference: "", mercadoPagoPaymentId: "", paymentProvider: "" };
    await tx.publicTournamentRegistration.updateMany({ where: { tournament, leadCpf: player.cpf, ...noFinancialRecord }, data: { leadCpf: "" } });
    await tx.publicTournamentRegistration.updateMany({ where: { tournament, partnerCpf: player.cpf, ...noFinancialRecord }, data: { partnerCpf: "" } });
  }
  await tx.playerNotification.deleteMany({ where: { playerId: owner.playerId } });
  await tx.playerPortalNotificationRead.deleteMany({ where: { playerId: owner.playerId } });
  await tx.comandaWhatsappDelivery.deleteMany({ where: { arenaId: owner.arenaId, playerId: owner.playerId } });
  await tx.whatsAppConversation.deleteMany({ where: { arenaId: owner.arenaId, playerId: owner.playerId, NOT: { remoteJid: { endsWith: "@g.us" } } } });
  return contactRetained;
}

export async function eraseArenaMembership(tx: ArenaTransaction, owner: { arenaId: string; playerId: string; accountId: string }) {
  // Lock global identity before the account, matching the password-reset lock order.
  const initial = await tx.playerAccount.findFirst({ where: { id: owner.accountId, arenaId: owner.arenaId, playerId: owner.playerId }, select: { identityId: true, phone: true, identity: { select: { phone: true } } } });
  if (!initial) throw new Error("Este vínculo já foi encerrado ou não pertence à sua conta.");
  if (initial.identityId) await tx.$queryRaw`SELECT id FROM "AthleteIdentity" WHERE id = ${initial.identityId} FOR UPDATE`;
  const accounts = await tx.$queryRaw<Array<{ id: string; identityId: string | null }>>`SELECT id, "identityId" FROM "PlayerAccount" WHERE id = ${owner.accountId} AND "arenaId" = ${owner.arenaId} AND "playerId" = ${owner.playerId} FOR UPDATE`;
  if (accounts.length !== 1 || accounts[0].identityId !== initial.identityId) throw new Error("O vínculo foi alterado. Entre novamente para continuar.");
  await lockPrivacyOwner(tx, owner);
  const profileIds = [owner.playerId];
  let frontier = [owner.playerId];
  while (frontier.length) {
    const aliases = await tx.player.findMany({ where: { arenaId: owner.arenaId, mergedIntoPlayerId: { in: frontier }, account: null, id: { notIn: profileIds } }, select: { id: true } });
    frontier = aliases.map(alias => alias.id);
    profileIds.push(...frontier);
  }
  let contactRetained = false;
  for (const playerId of profileIds) contactRetained = await eraseLinkedProfile(tx, { arenaId: owner.arenaId, playerId }, initial.identity?.phone ?? initial.phone) || contactRetained;
  await tx.playerVerificationCode.deleteMany({ where: { arenaId: owner.arenaId, phone: initial.phone } });
  await tx.playerAuthAttempt.deleteMany({ where: { arenaId: owner.arenaId, phone: initial.phone } });
  // Remove free text from earlier privacy requests; retain minimal proof of handling.
  await tx.privacyRequest.updateMany({ where: { arenaId: owner.arenaId, playerId: { in: profileIds } }, data: { message: "", response: "Pedido anterior vinculado ao encerramento do cadastro.", status: "COMPLETED", resolvedAt: new Date() } });
  const receipt = await tx.privacyRequest.create({ data: { arenaId: owner.arenaId, playerId: owner.playerId, kind: "ERASURE", status: "COMPLETED", response: erasureRetentionNotice, resolvedAt: new Date() }, select: { id: true, resolvedAt: true } });
  await tx.playerAccount.delete({ where: { id: owner.accountId } });
  if (initial.identityId && await tx.playerAccount.count({ where: { identityId: initial.identityId } }) === 0) await tx.athleteIdentity.delete({ where: { id: initial.identityId } });
  await tx.auditEvent.create({ data: { arenaId: owner.arenaId, actorId: owner.playerId, actorName: "Titular dos dados", action: "ARENA_MEMBERSHIP_ERASED", entityId: receipt.id, details: { playerId: owner.playerId, retained: ["financial", "fiscal", "contract", "audit", "backup", "ambiguous-records"] } } });
  await tx.arenaNotification.create({ data: { arenaId: owner.arenaId, type: "PRIVACY_ERASURE", title: "Vínculo encerrado pelo titular", message: "Um titular removeu o acesso e os dados do perfil. Revise a conservação dos registros operacionais e a existência de obrigações pendentes.", href: "/configuracoes/privacidade" } });
  return { protocol: receipt.id, completedAt: receipt.resolvedAt?.toISOString(), contactReferenceRetained: contactRetained, retentionNotice: `${erasureRetentionNotice}${contactRetained ? " Uma referência protegida do contato foi conservada enquanto houver obrigações pendentes; ela não transfere dívidas nem libera acesso ao histórico em novos cadastros." : ""}` };
}
