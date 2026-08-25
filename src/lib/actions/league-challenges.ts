"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { parseScheduledAt } from "@/lib/calendar/inputs";
import { prisma } from "@/lib/prisma";

const proposalSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  proposerPairId: z.string().trim().min(1),
  opponentPairId: z.string().trim().min(1),
  courtId: z.string().trim().min(1),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

function publicPortalPath(arenaSlug: string) { return `/classificacao/${arenaSlug}?tab=portal`; }

async function validateCourtAvailability({ arenaId, courtId, startsAt, endsAt }: { arenaId: string; courtId: string; startsAt: Date; endsAt: Date }) {
  const court = await prisma.court.findFirst({ where: { id: courtId, arenaId, active: true }, include: { weeklyRules: true } });
  if (!court) throw new Error("Quadra não encontrada.");
  const startsAtMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endsAtMinute = endsAt.getHours() * 60 + endsAt.getMinutes();
  const available = court.weeklyRules.some((rule) => rule.weekday === startsAt.getDay() && rule.available && rule.startsAtMinute <= startsAtMinute && rule.endsAtMinute >= endsAtMinute);
  if (!available) throw new Error("Este horário não está disponível nesta quadra.");
  const conflict = await prisma.scheduleOccurrence.findFirst({ where: { arenaId, status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId } } }, select: { id: true } });
  if (conflict) throw new Error("Este horário não está mais disponível.");
  return court;
}

export async function createLeagueChallengeAction(formData: FormData) {
  const parsed = proposalSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), proposerPairId: formData.get("proposerPairId"), opponentPairId: formData.get("opponentPairId"), courtId: formData.get("courtId"), startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados do desafio inválidos.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const [proposer, opponent] = await Promise.all([
    prisma.categoryPair.findUnique({
      where: { id: parsed.data.proposerPairId },
      include: { players: { select: { playerId: true } }, competition: { select: { id: true, format: true, category: { select: { tournament: { select: { arenaId: true } } } } } } },
    }),
    prisma.categoryPair.findUnique({ where: { id: parsed.data.opponentPairId }, include: { players: { select: { playerId: true } } } }),
  ]);
  if (!proposer || !opponent || proposer.id === opponent.id || proposer.competition.category.tournament.arenaId !== auth.arenaId || proposer.competition.format !== "LEAGUE") throw new Error("Desafio de Liga inválido.");
  if (!proposer.players.some((entry) => entry.playerId === auth.playerId)) throw new Error("Você não participa desta dupla.");
  if (opponent.competitionId !== proposer.competitionId) throw new Error("A dupla convidada deve ser da mesma categoria.");
  if (proposer.groupId && proposer.groupId !== opponent.groupId) throw new Error("A dupla convidada deve ser do mesmo grupo.");
  const categoryMatch = await prisma.categoryMatch.findFirst({ where: { competitionId: proposer.competitionId, winnerPairId: null, OR: [{ homePairId: proposer.id, awayPairId: opponent.id }, { homePairId: opponent.id, awayPairId: proposer.id }] }, select: { id: true } });
  if (!categoryMatch) throw new Error("Não existe jogo pendente entre estas duplas.");
  await validateCourtAvailability({ arenaId: auth.arenaId, courtId: parsed.data.courtId, startsAt, endsAt });
  const challenge = await prisma.leagueChallenge.create({ data: { arenaId: auth.arenaId, competitionId: proposer.competitionId, categoryMatchId: categoryMatch.id, courtId: parsed.data.courtId, proposerPairId: proposer.id, opponentPairId: opponent.id, proposedStartsAt: startsAt, proposedEndsAt: endsAt } });
  await prisma.playerNotification.createMany({ data: opponent.players.map((entry) => ({ playerId: entry.playerId, title: "Novo desafio de Liga", message: "Sua dupla recebeu uma proposta de jogo.", href: `${publicPortalPath(parsed.data.arenaSlug)}#desafio-${challenge.id}` })) });
  revalidatePath(publicPortalPath(parsed.data.arenaSlug));
}

export async function respondLeagueChallengeAction(formData: FormData) {
  const parsed = z.object({ arenaSlug: z.string().trim().min(1), challengeId: z.string().trim().min(1), response: z.enum(["ACCEPTED", "REJECTED"]) }).safeParse({ arenaSlug: formData.get("arenaSlug"), challengeId: formData.get("challengeId"), response: formData.get("response") });
  if (!parsed.success) throw new Error("Resposta de desafio inválida.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const challenge = await prisma.leagueChallenge.findFirst({ where: { id: parsed.data.challengeId, arenaId: auth.arenaId, status: "PENDING" }, include: { court: true, proposerPair: { include: { players: { select: { playerId: true } } } }, opponentPair: { include: { players: { select: { playerId: true } } } }, categoryMatch: true } });
  if (!challenge) throw new Error("Este desafio não está mais disponível.");
  if (!challenge.opponentPair.players.some((entry) => entry.playerId === auth.playerId)) throw new Error("Somente a dupla convidada pode responder.");
  const proposerIds = challenge.proposerPair.players.map((entry) => entry.playerId);
  if (parsed.data.response === "REJECTED") {
    await prisma.$transaction([
      prisma.leagueChallenge.update({ where: { id: challenge.id }, data: { status: "REJECTED", responderId: auth.playerId, respondedAt: new Date() } }),
      prisma.playerNotification.createMany({ data: proposerIds.map((playerId) => ({ playerId, title: "Desafio recusado", message: "A dupla convidada recusou a proposta de jogo.", href: publicPortalPath(parsed.data.arenaSlug) })) }),
    ]);
    revalidatePath(publicPortalPath(parsed.data.arenaSlug));
    return;
  }
  await validateCourtAvailability({ arenaId: auth.arenaId, courtId: challenge.courtId, startsAt: challenge.proposedStartsAt, endsAt: challenge.proposedEndsAt });
  const participantIds = Array.from(new Set([...proposerIds, ...challenge.opponentPair.players.map((entry) => entry.playerId)]));
  await prisma.$transaction(async (tx) => {
    await tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, challengeId: challenge.id, sourceType: "LEAGUE_CHALLENGE", title: `${challenge.proposerPair.name} × ${challenge.opponentPair.name}`, startsAt: challenge.proposedStartsAt, endsAt: challenge.proposedEndsAt, status: "PENDING_CONFIRMATION", bookingTypeName: "Liga", notes: "Jogo criado por convite entre duplas.", occurrenceCourts: { create: { courtId: challenge.courtId } }, participants: { create: participantIds.map((playerId) => ({ playerId })) } } });
    await tx.categoryMatch.update({ where: { id: challenge.categoryMatchId }, data: { courtName: challenge.court.name, scheduledDate: `${challenge.proposedStartsAt.getFullYear()}-${String(challenge.proposedStartsAt.getMonth() + 1).padStart(2, "0")}-${String(challenge.proposedStartsAt.getDate()).padStart(2, "0")}`, scheduledTime: `${String(challenge.proposedStartsAt.getHours()).padStart(2, "0")}:${String(challenge.proposedStartsAt.getMinutes()).padStart(2, "0")}`, manualStatus: "PENDING_CONFIRMATION" } });
    await tx.leagueChallenge.update({ where: { id: challenge.id }, data: { status: "ACCEPTED", responderId: auth.playerId, respondedAt: new Date() } });
    await tx.playerNotification.createMany({ data: proposerIds.map((playerId) => ({ playerId, title: "Desafio aceito", message: "A partida aguarda a confirmação da arena.", href: publicPortalPath(parsed.data.arenaSlug) })) });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "LEAGUE_CHALLENGE", title: "Desafio de Liga aceito", message: `${challenge.proposerPair.name} × ${challenge.opponentPair.name} aguarda confirmação da arena.`, href: `/agenda?data=${challenge.proposedStartsAt.getFullYear()}-${String(challenge.proposedStartsAt.getMonth() + 1).padStart(2, "0")}-${String(challenge.proposedStartsAt.getDate()).padStart(2, "0")}` } });
  });
  revalidatePath("/agenda");
  revalidatePath(publicPortalPath(parsed.data.arenaSlug));
}
