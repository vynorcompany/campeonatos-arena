import type { Player, Prisma } from "@prisma/client";

export function validateRegistrationThird(format: string | undefined, input: { thirdName?: string; thirdPhone?: string; thirdCpf?: string; leadCpf?: string; partnerCpf?: string }) {
  if (format !== "TRIO") {
    if (input.thirdName || input.thirdPhone || input.thirdCpf) throw new Error("Esta categoria aceita somente dois atletas.");
    return;
  }
  if (!input.thirdName || input.thirdName.trim().split(/\s+/).length < 2 || !input.thirdPhone || input.thirdPhone.replace(/\D/g, "").length < 8 || !/^\d{11}$/.test(input.thirdCpf ?? "")) throw new Error("Informe nome completo, telefone e CPF do terceiro atleta.");
  if (new Set([input.leadCpf, input.partnerCpf, input.thirdCpf]).size !== 3) throw new Error("Os três atletas devem ter CPFs diferentes.");
}

/** Called in the same payment-confirmation transaction as the registration. */
export async function ensureRegistrationTrio(tx: Prisma.TransactionClient, arenaId: string, registrationId: string) {
  const registration = await tx.publicTournamentRegistration.findFirst({ where: { id: registrationId, tournament: { arenaId } }, include: { category: { include: { competition: true } } } });
  if (registration?.category?.competition?.format !== "TRIO") return false;
  if (registration.paymentStatus !== "PAID" || registration.status !== "CONFIRMED") throw new Error("Confirme o pagamento antes de incluir o Trio na competição.");
  const competition = registration.category.competition;
  validateRegistrationThird("TRIO", registration);
  const roster: Player[] = [];
  for (const [name, cpf, phone] of [[registration.leadName, registration.leadCpf, registration.leadPhone], [registration.partnerName, registration.partnerCpf, registration.partnerPhone], [registration.thirdName, registration.thirdCpf, registration.thirdPhone]]) {
    const existing = await tx.player.findFirst({ where: { arenaId, cpf, mergedIntoPlayerId: null }, orderBy: [{ active: "desc" }, { createdAt: "asc" }, { id: "asc" }] });
    roster.push(existing ?? await tx.player.create({ data: { arenaId, name, cpf, phone } }));
  }
  const teams = await tx.categoryPair.findMany({ where: { competitionId: competition.id }, include: { players: true } });
  if (teams.some(team => team.players.length === 3 && team.players.every(member => roster.some(player => player.id === member.playerId)))) return true;
  if (competition.status !== "DRAFT") throw new Error("As inscrições do Trio precisam estar confirmadas antes da publicação do sorteio.");
  if (teams.some(team => team.players.some(member => roster.some(player => player.id === member.playerId)))) throw new Error("Um dos atletas já está inscrito em outra equipe desta categoria.");
  const team = await tx.categoryPair.create({ data: { competitionId: competition.id, name: roster.map(player => player.name).join(" / "), totalPoints: roster.reduce((sum, player) => sum + player.points, 0), drawOrder: Math.max(0, ...teams.map(team => team.drawOrder)) + 1 } });
  await tx.categoryPairPlayer.createMany({ data: roster.map((player, index) => ({ pairId: team.id, competitionId: competition.id, playerId: player.id, slot: index + 1 })) });
  return true;
}
