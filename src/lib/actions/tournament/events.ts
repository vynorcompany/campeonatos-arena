"use server";
import { archiveTournamentCategory } from "@/lib/tournaments/category-removal";
import { withArenaTransaction } from "@/lib/rls";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { createTournamentSchema, updateTournamentEventSchema, updateTournamentSchema } from "@/lib/validators/tournament";
import { deleteTournament, finishTournament, reopenTournament, updateTournamentSettings } from "@/lib/services/tournament";
import { parseCategoryList, parseReaisToCents } from "@/lib/tournaments/inputs";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";
import { ActionState, ensureRankingBelongsToArena, parseOptionalDate, runRankingSerializableTransaction } from "@/lib/actions/tournament/shared";

export async function createTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requirePermission("tournaments:manage");
  const parsed = createTournamentSchema.safeParse({
    creationMode: formData.get("creationMode"),
    name: formData.get("name"),
    description: formData.get("description"),
    responsibleName: formData.get("responsibleName"),
    responsiblePhone: formData.get("responsiblePhone"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    registrationOpensAt: formData.get("registrationOpensAt"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    earlyDiscountReais: formData.get("earlyDiscountReais"),
    earlyDiscountUntil: formData.get("earlyDiscountUntil"),
    firstBonusLimit: formData.get("firstBonusLimit"),
    firstBonusUntil: formData.get("firstBonusUntil"),
    publicSlug: formData.get("publicSlug"),
    registrationPhase: formData.get("registrationPhase"),
    showInEventRadar: formData.get("showInEventRadar") === "on",
    onlinePaymentEnabled: formData.has("onlinePaymentEnabledPresent") ? formData.get("onlinePaymentEnabled") === "on" : undefined,
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    priceFirstCents: formData.get("priceFirstCents"),
    priceSecondCents: formData.get("priceSecondCents"),
    priceThirdCents: formData.get("priceThirdCents"),
    blockCategoryGap: formData.get("blockCategoryGap") === "on",
    maxCategoryGap: formData.get("maxCategoryGap"),
    categoryList: formData.get("categoryList"),
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
  const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
  const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
  const earlyDiscountCents = parseReaisToCents(parsed.data.earlyDiscountReais);
  const categories = parsed.data.categoryList
    ? parseCategoryList(parsed.data.categoryList, priceFirstCents, priceSecondCents, priceThirdCents)
    : [];
  const created = await runRankingSerializableTransaction(async (tx) => {
    const rankingId = await ensureRankingBelongsToArena(
      tx,
      auth.arenaId,
      parsed.data.rankingId || null,
    );
    return tx.tournament.create({
      data: {
        arenaId: auth.arenaId,
        name: parsed.data.name,
        description: parsed.data.description,
        responsibleName: parsed.data.responsibleName,
        responsiblePhone: parsed.data.responsiblePhone,
        startsAt: parseOptionalDate(parsed.data.startsAt),
        endsAt: parseOptionalDate(parsed.data.endsAt),
        registrationOpensAt: parseOptionalDate(parsed.data.registrationOpensAt),
        registrationClosesAt: parseOptionalDate(parsed.data.registrationClosesAt),
        earlyDiscountCents,
        earlyDiscountUntil: parseOptionalDate(parsed.data.earlyDiscountUntil),
        firstBonusLimit: parsed.data.firstBonusLimit,
        firstBonusUntil: parseOptionalDate(parsed.data.firstBonusUntil),
        publicSlug: parsed.data.publicSlug,
        creationMode: parsed.data.creationMode,
        registrationPhase: parsed.data.registrationPhase,
        status: parsed.data.registrationPhase === "FINISHED" ? "FINISHED" : parsed.data.registrationPhase === "EDITING" ? "DRAFT" : "PUBLISHED",
        showInEventRadar: parsed.data.showInEventRadar,
        onlinePaymentEnabled: parsed.data.onlinePaymentEnabled ?? true,
        groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
        pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
        priceFirstCents,
        priceSecondCents,
        priceThirdCents,
        blockCategoryGap: parsed.data.blockCategoryGap,
        maxCategoryGap: parsed.data.maxCategoryGap,
        rankingId,
        ...(categories.length
          ? {
              categories: {
                createMany: {
                  data: categories
                }
              }
            }
          : {})
      }
    });
  });

  refreshTournamentRoutes();
  return { error: null, success: "Torneio criado com sucesso.", tournamentId: created.id };
}

export async function createTournamentCategoryAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const registrationType = String(formData.get("registrationType") ?? "PAIR");
  if (!["PAIR", "INDIVIDUAL"].includes(registrationType)) throw new Error("Tipo de inscrição inválido.");
  if (!tournamentId || name.length < 3) throw new Error("Informe um nome de categoria com pelo menos 3 caracteres.");
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, arenaId: auth.arenaId },
    select: { id: true, groupCount: true, pairsPerGroup: true, priceFirstCents: true, priceSecondCents: true, priceThirdCents: true, categories: { select: { level: true } } },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");
  const category = await prisma.tournamentCategory.create({
    data: {
      tournamentId: tournament.id,
      name,
      registrationType,
      level: Math.max(0, ...tournament.categories.map((item) => item.level)) + 1,
      groupCount: tournament.groupCount,
      pairsPerGroup: tournament.pairsPerGroup,
      priceFirstCents: tournament.priceFirstCents,
      priceSecondCents: tournament.priceSecondCents,
      priceThirdCents: tournament.priceThirdCents,
    },
  });
  refreshTournamentRoutes();
  redirect(`/torneios/${tournament.id}/categorias/${category.id}`);
}

export async function finishTournamentAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await finishTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function reopenTournamentAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await reopenTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function updateTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requirePermission("tournaments:manage");

  if (!formData.has("publicSlug")) {
    const eventParsed = updateTournamentEventSchema.safeParse({
      tournamentId: formData.get("tournamentId"),
      name: formData.get("name"),
      description: formData.get("description"),
      rules: formData.get("rules"),
    });

    if (!eventParsed.success) {
      return {
        error: eventParsed.error.issues[0]?.message ?? "Dados inválidos.",
        success: null,
      };
    }

    const updated = await withArenaTransaction(auth.arenaId, tx => tx.tournament.updateMany({
      where: {
        id: eventParsed.data.tournamentId,
        arenaId: auth.arenaId,
      },
      data: {
        name: eventParsed.data.name,
        description: eventParsed.data.description,
        rules: eventParsed.data.rules,
        ...(formData.has("onlinePaymentEnabledPresent") ? { onlinePaymentEnabled: formData.get("onlinePaymentEnabled") === "on" } : {}),
      },
    }));

    if (!updated.count) {
      return { error: "Evento não encontrado.", success: null };
    }

    refreshTournamentRoutes();
    revalidatePath(`/torneios/${eventParsed.data.tournamentId}`);
    return { error: null, success: "Evento atualizado com sucesso." };
  }

  const parsed = updateTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    creationMode: formData.get("creationMode"),
    name: formData.get("name"),
    description: formData.get("description"),
    responsibleName: formData.get("responsibleName"),
    responsiblePhone: formData.get("responsiblePhone"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    registrationOpensAt: formData.get("registrationOpensAt"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    earlyDiscountReais: formData.get("earlyDiscountReais"),
    earlyDiscountUntil: formData.get("earlyDiscountUntil"),
    firstBonusLimit: formData.get("firstBonusLimit"),
    firstBonusUntil: formData.get("firstBonusUntil"),
    publicSlug: formData.get("publicSlug"),
    registrationPhase: formData.get("registrationPhase"),
    showInEventRadar: formData.get("showInEventRadar") === "on",
    onlinePaymentEnabled: formData.has("onlinePaymentEnabledPresent") ? formData.get("onlinePaymentEnabled") === "on" : undefined,
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    priceFirstCents: formData.get("priceFirstCents"),
    priceSecondCents: formData.get("priceSecondCents"),
    priceThirdCents: formData.get("priceThirdCents"),
    blockCategoryGap: formData.get("blockCategoryGap") === "on",
    maxCategoryGap: formData.get("maxCategoryGap"),
    categoryList: formData.get("categoryList"),
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
    const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
    const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
    const earlyDiscountCents = parseReaisToCents(parsed.data.earlyDiscountReais);
    const categories = parseCategoryList(parsed.data.categoryList, priceFirstCents, priceSecondCents, priceThirdCents);
    await updateTournamentSettings(parsed.data.tournamentId, auth.arenaId, {
      name: parsed.data.name,
      description: parsed.data.description,
      responsibleName: parsed.data.responsibleName,
      responsiblePhone: parsed.data.responsiblePhone,
      startsAt: parseOptionalDate(parsed.data.startsAt),
      endsAt: parseOptionalDate(parsed.data.endsAt),
      registrationOpensAt: parseOptionalDate(parsed.data.registrationOpensAt),
      registrationClosesAt: parseOptionalDate(parsed.data.registrationClosesAt),
      earlyDiscountCents,
      earlyDiscountUntil: parseOptionalDate(parsed.data.earlyDiscountUntil),
      firstBonusLimit: parsed.data.firstBonusLimit,
      firstBonusUntil: parseOptionalDate(parsed.data.firstBonusUntil),
      publicSlug: parsed.data.publicSlug,
      creationMode: parsed.data.creationMode,
      registrationPhase: parsed.data.registrationPhase,
      showInEventRadar: parsed.data.showInEventRadar,
      onlinePaymentEnabled: parsed.data.onlinePaymentEnabled,
      groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
      pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
      priceFirstCents,
      priceSecondCents,
      priceThirdCents,
      blockCategoryGap: parsed.data.blockCategoryGap,
      maxCategoryGap: parsed.data.maxCategoryGap,
      categoryList: categories,
      rankingId: parsed.data.rankingId || null
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível atualizar o torneio.",
      success: null
    };
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return { error: null, success: "Torneio atualizado com sucesso." };
}

export async function deleteTournamentAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await deleteTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function updateTournamentStatusAction(formData: FormData) {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = new Set(["DRAFT", "READY_FOR_DRAW", "GROUPS_DEFINED", "MATCHES_DEFINED", "FINISHED"]);

  if (!tournamentId || !allowed.has(status)) {
    throw new Error("Dados invalidos para atualizacao do status.");
  }

  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId: auth.arenaId
    },
    data: { status }
  });

  if (!updated.count) {
    throw new Error("Torneio nao encontrado.");
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function removeTournamentCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requirePermission("tournaments:manage");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const expectedRegistrationCount = Number(formData.get("expectedRegistrationCount") ?? "");
  if (!tournamentId || !categoryId || !formData.has("expectedRegistrationCount") || !Number.isInteger(expectedRegistrationCount) || expectedRegistrationCount < 0) return { error: "Categoria ou confirmação inválida. Atualize a página.", success: null };
  let result: Awaited<ReturnType<typeof archiveTournamentCategory>>;
  try {
    result = await withArenaTransaction(auth.arenaId, tx => archiveTournamentCategory(tx, {
      arenaId: auth.arenaId, tournamentId, categoryId,
      confirmed: formData.get("confirmed") === "on", expectedRegistrationCount, actorId: auth.userId, actorName: auth.userName,
    }));
  } catch {
    return { error: "Não foi possível remover a categoria. Nenhum dado foi alterado. Atualize a página e tente novamente.", success: null };
  }
  if (!result.ok) return { error: result.error, success: null };
  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
  revalidatePath(`/torneios/${tournamentId}/categorias`);
  revalidatePath(`/torneios/${tournamentId}/categorias/${categoryId}`);
  revalidatePath("/inscricao/[slug]", "page");
  return { error: null, success: "Categoria removida. Histórico e pagamentos preservados." };
}
