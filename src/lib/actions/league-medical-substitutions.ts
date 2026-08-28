"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { replaceCategoryPairPlayer } from "@/lib/services/category-competition";

const requestSchema = z.object({ arenaSlug: z.string().trim().min(1), pairId: z.string().trim().min(1), previousPlayerId: z.string().trim().min(1), replacementPlayerId: z.string().trim().min(1), reason: z.string().trim().min(10).max(1200) });

const portalPath = (arenaSlug: string) => `/classificacao/${arenaSlug}?tab=portal`;

export async function requestLeagueMedicalSubstitutionAction(formData: FormData) {
  const parsed = requestSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), pairId: formData.get("pairId"), previousPlayerId: formData.get("previousPlayerId"), replacementPlayerId: formData.get("replacementPlayerId"), reason: formData.get("reason") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados da substituição inválidos.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const pair = await prisma.categoryPair.findFirst({ where: { id: parsed.data.pairId, active: true, competition: { format: "LEAGUE", category: { tournament: { arenaId: auth.arenaId } } } }, include: { players: { select: { playerId: true } } } });
  if (!pair || !pair.players.some((item) => item.playerId === auth.playerId)) throw new Error("Você não participa desta dupla.");
  if (!pair.players.some((item) => item.playerId === parsed.data.previousPlayerId)) throw new Error("O atleta afastado não pertence à dupla.");
  if (pair.players.some((item) => item.playerId === parsed.data.replacementPlayerId)) throw new Error("O substituto já está nesta dupla.");
  const replacement = await prisma.player.findFirst({ where: { id: parsed.data.replacementPlayerId, arenaId: auth.arenaId, active: true }, select: { id: true } });
  if (!replacement) throw new Error("Atleta substituto não encontrado.");
  const existing = await prisma.leagueMedicalSubstitutionRequest.findFirst({ where: { pairId: pair.id, status: "PENDING" }, select: { id: true } });
  if (existing) throw new Error("Já existe uma solicitação pendente para esta dupla.");
  await prisma.$transaction(async (tx) => {
    const request = await tx.leagueMedicalSubstitutionRequest.create({ data: { pairId: pair.id, previousPlayerId: parsed.data.previousPlayerId, replacementPlayerId: parsed.data.replacementPlayerId, requestedByPlayerId: auth.playerId, reason: parsed.data.reason } });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "LEAGUE_MEDICAL_SUBSTITUTION", title: "Substituição médica solicitada", message: "Uma dupla de Liga solicitou a troca de atleta por afastamento médico.", href: `/torneios?medicalRequest=${request.id}` } });
  });
  revalidatePath(portalPath(parsed.data.arenaSlug));
}

export async function reviewLeagueMedicalSubstitutionAction(formData: FormData) {
  const parsed = z.object({ requestId: z.string().trim().min(1), decision: z.enum(["APPROVED", "REJECTED"]), reviewNotes: z.string().trim().max(1200).optional() }).safeParse({ requestId: formData.get("requestId"), decision: formData.get("decision"), reviewNotes: formData.get("reviewNotes") });
  if (!parsed.success) throw new Error("Dados da análise inválidos.");
  const auth = await requireModuleEdit("tournaments");
  const request = await prisma.leagueMedicalSubstitutionRequest.findFirst({
    where: { id: parsed.data.requestId, status: "PENDING", pair: { competition: { category: { tournament: { arenaId: auth.arenaId } } } } },
    include: {
      pair: {
        include: {
          competition: {
            include: {
              category: {
                include: { tournament: { include: { arena: { select: { slug: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!request) throw new Error("Solicitação não encontrada.");
  if (parsed.data.decision === "APPROVED") await replaceCategoryPairPlayer(auth.arenaId, { pairId: request.pairId, previousPlayerId: request.previousPlayerId, replacementPlayerId: request.replacementPlayerId });
  await prisma.leagueMedicalSubstitutionRequest.update({ where: { id: request.id }, data: { status: parsed.data.decision, reviewedAt: new Date(), reviewNotes: parsed.data.reviewNotes ?? "" } });
  await prisma.playerNotification.create({ data: { playerId: request.requestedByPlayerId, title: parsed.data.decision === "APPROVED" ? "Substituição aprovada" : "Substituição recusada", message: parsed.data.decision === "APPROVED" ? "A arena aprovou a substituição médica da sua dupla." : "A arena recusou a solicitação de substituição médica.", href: portalPath(request.pair.competition.category.tournament.arena.slug) } });
  revalidatePath("/torneios");
  revalidatePath(portalPath(request.pair.competition.category.tournament.arena.slug));
}
