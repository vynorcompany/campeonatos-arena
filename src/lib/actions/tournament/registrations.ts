"use server";
import { validateRegistrationThird } from "@/lib/tournaments/trio-registration";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { recordTournamentRegistrationReceipt } from "@/lib/tournaments/registration-receipt";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTournamentMatchEdit } from "@/lib/auth/guards";
import { createManualTournamentRegistrationSchema, updateManualTournamentRegistrationSchema } from "@/lib/validators/public-registration";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";
import { updateManualTournamentRegistration } from "@/lib/tournaments/manual-registration-update";
import { canDeleteTournamentRegistration } from "@/lib/tournaments/registration-deletion";
import { lockTournamentRegistrations, nextTournamentRegistrationOrder } from "@/lib/tournaments/registration-order";
import { withArenaTransaction } from "@/lib/rls";
import { normalizeCpf, normalizeDateInput, parseReaisToCents } from "@/lib/tournaments/inputs";
import { buildCategoryBracketSeeds, hasStartedCategoryBracket } from "@/lib/tournament/bracket";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";
import { ActionState } from "@/lib/actions/tournament/shared";

export async function updateTournamentRegistrationPhaseAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const registrationPhase = String(formData.get("registrationPhase") ?? "");
  const allowed = new Set(["REGISTRATIONS", "EDITING", "LIVE", "FINISHED"]);

  if (!tournamentId || !allowed.has(registrationPhase)) {
    throw new Error("Dados inválidos para atualização da fase.");
  }

  const statusByPhase: Record<string, string> = {
    EDITING: "DRAFT",
    REGISTRATIONS: "PUBLISHED",
    LIVE: "PUBLISHED",
    FINISHED: "FINISHED"
  };
  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId: auth.arenaId
    },
    data: { registrationPhase, status: statusByPhase[registrationPhase] }
  });

  if (!updated.count) {
    throw new Error("Torneio não encontrado.");
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function generateCategoryBracketAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!tournamentId || !categoryId) {
    throw new Error("Torneio ou categoria inválidos.");
  }

  await withArenaTransaction(auth.arenaId, async (tx) => {
    // Public registration locks the tournament before writing. Read the
    // confirmed field only after obtaining the same lock.
    await lockTournamentRegistrations(tx, tournamentId, auth.arenaId);
    const tournament = await tx.tournament.findFirst({
      where: { id: tournamentId, arenaId: auth.arenaId },
      select: { registrationPhase: true }
    });
    if (!tournament || tournament.registrationPhase === "REGISTRATIONS") {
      throw new Error("Encerre as inscrições do torneio antes de montar o chaveamento.");
    }
    // Serialize generation and schedule edits on the same category row.
    const categoryRows = await tx.$queryRaw<Array<{ id: string; registrationType?: string; format?: string }>>`
      SELECT c."id", c."registrationType", cc.format::text AS format FROM "TournamentCategory" c
      LEFT JOIN "CategoryCompetition" cc ON cc."categoryId"=c.id
      JOIN "Tournament" t ON t."id" = c."tournamentId"
      WHERE c."id" = ${categoryId} AND c."tournamentId" = ${tournamentId} AND t."arenaId" = ${auth.arenaId}
      FOR UPDATE OF c
    `;
    if (categoryRows.length !== 1) throw new Error("Torneio ou categoria não encontrados nesta arena.");
    if (categoryRows[0].registrationType === "INDIVIDUAL") throw new Error("Categorias de inscrição individual não possuem jogos.");
    if (categoryRows[0].format === "TRIO") throw new Error("Monte os confrontos do Trio em Eventos → categoria → Grupos, para preservar ida, volta e desempate.");
    const registrations = await tx.publicTournamentRegistration.findMany({
      where: { tournamentId, categoryId, status: "CONFIRMED" },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    const firstRoundSeeds = buildCategoryBracketSeeds(registrations.map((item) => item.id));
    const existing = await tx.categoryBracket.findFirst({
      where: { tournamentId, categoryId },
      select: { id: true, matches: { select: { scheduledTime: true, courtName: true, status: true, winnerRegistrationId: true } } }
    });
    if (existing && hasStartedCategoryBracket(existing.matches)) {
      throw new Error("Esta chave já possui jogos agendados ou em andamento. Não é possível remontá-la sem perder esses dados.");
    }
    const bracket = await tx.categoryBracket.upsert({
      where: {
        tournamentId_categoryId: {
          tournamentId,
          categoryId
        }
      },
      create: {
        tournamentId,
        categoryId,
        status: "READY"
      },
      update: {
        status: "READY"
      }
    });

    await tx.categoryBracketMatch.deleteMany({
      where: { bracketId: bracket.id }
    });

    let roundOrder = 1;
    let roundSize = firstRoundSeeds.length;
    let roundIndex = 1;

    for (const seed of firstRoundSeeds) {
      await tx.categoryBracketMatch.create({
        data: {
          bracketId: bracket.id,
          stage: "ROUND_1",
          label: `R1 - Jogo ${roundOrder}`,
          roundOrder,
          homeRegistrationId: seed.home,
          awayRegistrationId: seed.away
        }
      });
      roundOrder += 1;
    }

    while (roundSize > 1) {
      const next = roundSize / 2;
      roundIndex += 1;
      for (let i = 1; i <= next; i += 1) {
        await tx.categoryBracketMatch.create({
          data: {
            bracketId: bracket.id,
            stage: next === 1 ? "FINAL" : `ROUND_${roundIndex}`,
            label: next === 1 ? "Final" : `R${roundIndex} - Jogo ${i}`,
            roundOrder
          }
        });
        roundOrder += 1;
      }
      roundSize = next;
    }
  });

  refreshTournamentRoutes();
}

export async function updateCategoryBracketMatchScheduleAction(formData: FormData) {
  const auth = await requireTournamentMatchEdit();
  const matchId = String(formData.get("matchId") ?? "");
  const scheduledTime = String(formData.get("scheduledTime") ?? "");
  const courtName = String(formData.get("courtName") ?? "");
  if (!matchId) throw new Error("Jogo inválido.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.categoryBracketMatch.findFirst({
      where: { id: matchId, bracket: { tournament: { arenaId: auth.arenaId } } },
      select: { bracket: { select: { categoryId: true } } }
    });
    if (!match) throw new Error("Jogo não encontrado nesta arena.");
    await tx.$queryRaw`
      SELECT c."id" FROM "TournamentCategory" c
      JOIN "Tournament" t ON t."id" = c."tournamentId"
      WHERE c."id" = ${match.bracket.categoryId} AND t."arenaId" = ${auth.arenaId}
      FOR UPDATE OF c
    `;
    const updated = await tx.categoryBracketMatch.updateMany({
      where: { id: matchId, bracket: { tournament: { arenaId: auth.arenaId } } },
      data: { scheduledTime, courtName }
    });
    if (!updated.count) throw new Error("Jogo não encontrado nesta arena.");
  });
  revalidatePath("/torneios/inscricoes");
}

export async function updateTournamentCategoryFormatAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const groupCount = Number(formData.get("groupCount") ?? 0);
  const pairsPerGroup = Number(formData.get("pairsPerGroup") ?? 0);

  if (!tournamentId || !categoryId || !Number.isFinite(groupCount) || !Number.isFinite(pairsPerGroup)) {
    throw new Error("Dados inválidos para formato da categoria.");
  }

  await prisma.$transaction(async (tx) => {
    await lockTournamentRegistrations(tx, tournamentId, auth.arenaId);
    const tournament = await tx.tournament.findFirst({
      where: { id: tournamentId, arenaId: auth.arenaId },
      select: { registrationPhase: true }
    });
    if (!tournament || tournament.registrationPhase === "REGISTRATIONS") {
      throw new Error("Encerre as inscrições do torneio antes de alterar o formato da categoria.");
    }
    const updated = await tx.tournamentCategory.updateMany({
      where: { id: categoryId, tournamentId, tournament: { arenaId: auth.arenaId } },
      data: {
        groupCount: Math.min(8, Math.max(1, Math.trunc(groupCount))),
        pairsPerGroup: Math.min(16, Math.max(2, Math.trunc(pairsPerGroup)))
      }
    });
    if (!updated.count) throw new Error("Categoria não encontrada nesta arena.");
  });

  revalidatePath("/torneios/inscricoes");
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function createManualTournamentRegistrationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requirePermission("tournaments:manage");
  const parsed = createManualTournamentRegistrationSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    registrationType: formData.get("registrationType") || "PAIR",
    leadPlayerId: formData.get("leadPlayerId"),
    partnerPlayerId: formData.get("partnerPlayerId"),
    thirdPlayerId: formData.get("thirdPlayerId"),
    amountReais: formData.get("amountReais"),
    bankAccountId: formData.get("bankAccountId") || undefined,
    paymentStatus: formData.get("paymentStatus")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  if (parsed.data.leadPlayerId === parsed.data.partnerPlayerId) {
    return { error: "Os atletas da dupla devem ser diferentes.", success: null };
  }

  const amountCents = parseReaisToCents(parsed.data.amountReais);
  let result: ActionState;
  try {
    result = await withArenaTransaction(auth.arenaId, async (tx): Promise<ActionState> => {
      await lockTournamentRegistrations(tx, parsed.data.tournamentId, auth.arenaId);
      const categories = await tx.$queryRaw<Array<{ id: string; registrationType?: string; format?: string; competitionId?: string; competitionStatus?: string; maxRegistrations?: number }>>`
        SELECT tc."id", tc."registrationType", tc."maxRegistrations", c.format::text AS format, c.id AS "competitionId", c.status AS "competitionStatus" FROM "TournamentCategory" tc
        LEFT JOIN "CategoryCompetition" c ON c."categoryId"=tc.id
        WHERE tc."id" = ${parsed.data.categoryId} AND tc."tournamentId" = ${parsed.data.tournamentId} AND tc."active" = true AND tc."archivedAt" IS NULL
        FOR UPDATE OF tc
      `;
      if (categories.length !== 1) return { error: "Categoria inválida ou desativada para este torneio.", success: null };

      if (categories[0].maxRegistrations && await tx.publicTournamentRegistration.count({ where: { categoryId: categories[0].id, status: { not: "CANCELED" } } }) >= categories[0].maxRegistrations) return { error: "Esta categoria atingiu o limite máximo de inscrições.", success: null };
      const isIndividual = categories[0].registrationType === "INDIVIDUAL";
      if ((categories[0].registrationType ?? "PAIR") !== (parsed.data.registrationType ?? "PAIR")) return { error: "O tipo de inscrição não corresponde à categoria selecionada.", success: null };
      const participantCount = isIndividual ? 1 : categories[0].format === "TRIO" ? 3 : 2;
      const isTrio = categories[0].format === "TRIO";
      if (isTrio && categories[0].competitionStatus !== "DRAFT") return { error: "As inscrições do Trio já foram encerradas.", success: null };
      const requestedIds = [parsed.data.leadPlayerId, ...(parsed.data.partnerPlayerId ? [parsed.data.partnerPlayerId] : []), ...(parsed.data.thirdPlayerId ? [parsed.data.thirdPlayerId] : [])];
      if (requestedIds.length !== participantCount || new Set(requestedIds).size !== requestedIds.length) return { error: isIndividual ? "Selecione somente um participante." : isTrio ? "Selecione três atletas diferentes." : "Esta categoria aceita dois atletas diferentes.", success: null };

      const athletes = await tx.player.findMany({
        where: { arenaId: auth.arenaId, active: true, id: { in: requestedIds } },
        select: { id: true, name: true, phone: true, cpf: true, birthDate: true }
      });
      if (athletes.length !== participantCount || athletes.some((athlete) => !athlete.phone || !/^\d{11}$/.test(athlete.cpf))) {
        return { error: "Atleta não encontrado, inativo ou sem cadastro completo.", success: null };
      }
      const athletesById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
      const lead = athletesById.get(parsed.data.leadPlayerId);
      const partner = athletesById.get(parsed.data.partnerPlayerId);
      const third = parsed.data.thirdPlayerId ? athletesById.get(parsed.data.thirdPlayerId) : undefined;
      if (!lead || (!isIndividual && !partner)) {
        return { error: "Atleta não encontrado, inativo ou sem cadastro completo.", success: null };
      }

      try { validateRegistrationThird(categories[0].format, { leadCpf: lead.cpf, partnerCpf: partner?.cpf ?? "", thirdName: third?.name, thirdPhone: third?.phone, thirdCpf: third?.cpf }); }
      catch (error) { return { error: error instanceof Error ? error.message : "Equipe inválida.", success: null }; }

      if ((isTrio || isIndividual) && await tx.publicTournamentRegistration.count({ where: { categoryId: categories[0].id, tournamentId: parsed.data.tournamentId, status: { not: "CANCELED" }, OR: [{ leadCpf: { in: athletes.map(athlete => athlete.cpf) } }, { partnerCpf: { in: athletes.map(athlete => athlete.cpf) } }, { thirdCpf: { in: athletes.map(athlete => athlete.cpf) } }] } })) return { error: "Um dos atletas já está inscrito nesta categoria.", success: null };

      const bankAccountId = parsed.data.paymentStatus === "PAID" && amountCents > 0 ? await requireReceivingBankAccount(tx, auth.arenaId, parsed.data.bankAccountId) : null;
      const registrationOrder = await nextTournamentRegistrationOrder(tx, parsed.data.tournamentId);
      const registration = await tx.publicTournamentRegistration.create({
        data: {
          tournamentId: parsed.data.tournamentId,
          categoryId: categories[0].id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadCpf: lead.cpf,
          leadBirthDate: lead.birthDate,
          partnerName: partner?.name ?? "",
          partnerPhone: partner?.phone ?? "",
          partnerCpf: partner?.cpf ?? "",
          partnerBirthDate: partner?.birthDate ?? null,
          thirdName: third?.name ?? "", thirdPhone: third?.phone ?? "", thirdCpf: third?.cpf ?? "", thirdBirthDate: third?.birthDate ?? null,
          competitionId: isTrio ? categories[0].competitionId : undefined,
          registrationOrder,
          amountCents,
          paymentStatus: parsed.data.paymentStatus,
          status: parsed.data.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT",
          paymentProvider: "MANUAL",
          paymentReference: ""
        }
      });

      if (bankAccountId) await recordTournamentRegistrationReceipt(tx, { arenaId: auth.arenaId, registrationId: registration.id, bankAccountId, amountCents, leadName: lead.name, partnerName: partner?.name ?? "", thirdName: third?.name });

      if (parsed.data.paymentStatus === "PAID") {
        await ensureTournamentPairFromRegistration(tx, {
          thirdCpf: registration.thirdCpf,
          registrationId: registration.id,
          arenaId: auth.arenaId,
          tournamentId: parsed.data.tournamentId,
          leadName: lead.name,
          partnerName: partner?.name ?? "",
          leadPlayerId: lead.id,
          partnerPlayerId: partner?.id
        });
      }
      return { error: null, success: "Inscrição manual criada com sucesso." };
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Selecione")) return { error: error.message, success: null };
    return { error: "Não foi possível criar a inscrição. Nenhuma alteração foi aplicada.", success: null };
  }
  if (result.error) return result;

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return result;
}

export async function deleteTournamentRegistrationAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const registrationId = String(formData.get("registrationId") ?? "");

  if (!registrationId) {
    throw new Error("Inscricao invalida.");
  }

  const deleted = await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT r."id" FROM "PublicTournamentRegistration" r JOIN "Tournament" t ON t."id" = r."tournamentId" WHERE r."id" = ${registrationId} AND t."arenaId" = ${auth.arenaId} FOR UPDATE OF r`;
    const registration = await tx.publicTournamentRegistration.findFirst({
      where: { id: registrationId, tournament: { arenaId: auth.arenaId } },
      select: { status: true, paymentStatus: true, paymentProvider: true, paymentReference: true, mercadoPagoPaymentId: true, paymentCheckoutUrl: true }
    });
    if (!registration || !canDeleteTournamentRegistration(registration)) return { count: 0 };
    return tx.publicTournamentRegistration.deleteMany({
      where: { id: registrationId, tournament: { arenaId: auth.arenaId }, status: "PENDING_PAYMENT", paymentStatus: "PENDING", paymentProvider: "MANUAL", paymentReference: "", mercadoPagoPaymentId: "", paymentCheckoutUrl: "" }
    });
  });

  if (!deleted.count) {
    throw new Error("Somente inscrições manuais pendentes e sem cobrança podem ser excluídas. Pagamentos existentes precisam ser conciliados antes de qualquer remoção.");
  }

  refreshTournamentRoutes();
}

export async function updateTournamentRegistrationAction(
  stateOrFormData: ActionState | FormData,
  maybeFormData?: FormData
): Promise<ActionState> {
  const formData = stateOrFormData instanceof FormData ? stateOrFormData : maybeFormData;
  if (!formData) {
    return { error: "Dados invalidos.", success: null };
  }

  const auth = await requirePermission("tournaments:manage");
  const parsed = updateManualTournamentRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    registrationType: formData.get("registrationType") || "PAIR",
    leadName: formData.get("leadName"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: normalizeDateInput(formData.get("leadBirthDate")),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: normalizeDateInput(formData.get("partnerBirthDate")),
    thirdName: formData.get("thirdName"), thirdPhone: formData.get("thirdPhone"), thirdCpf: normalizeCpf(String(formData.get("thirdCpf") ?? "")), thirdBirthDate: normalizeDateInput(formData.get("thirdBirthDate")),
    amountReais: formData.get("amountReais"),
    bankAccountId: formData.get("bankAccountId") || undefined,
    paymentStatus: formData.get("paymentStatus")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos.", success: null };
  }

  const amountCents = parseReaisToCents(parsed.data.amountReais);
  let updated: Awaited<ReturnType<typeof updateManualTournamentRegistration>>;
  try {
    updated = await withArenaTransaction(auth.arenaId, (tx) => updateManualTournamentRegistration(tx, {
      ...parsed.data,
      arenaId: auth.arenaId,
      amountCents,
    }));
  } catch {
    return { error: "Não foi possível atualizar a inscrição. Nenhuma alteração foi aplicada.", success: null };
  }
  if (!updated.ok) return { error: updated.error, success: null };

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return { error: null, success: "Inscricao atualizada com sucesso." };
}
