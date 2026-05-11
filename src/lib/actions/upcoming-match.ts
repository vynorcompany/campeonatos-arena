"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getMissingTvTablesMessage, isPrismaSchemaOutdatedError } from "@/lib/prisma-errors";
import { savePublicImageUpload } from "@/lib/uploads";

const courtOptions = ["Agecon", "Elaine", "Origem"] as const;
const manualMatchStatusOptions = ["SCHEDULED", "LIVE", "FINISHED"] as const;

const manualUpcomingMatchSchema = z.object({
  homePairName: z.string().trim().max(80, "Dupla 1 deve ter no máximo 80 caracteres.").default(""),
  awayPairName: z.string().trim().max(80, "Dupla 2 deve ter no máximo 80 caracteres.").default(""),
  courtName: z.enum(courtOptions, {
    errorMap: () => ({ message: "Quadra inválida." })
  }),
  scheduledTime: z
    .string()
    .trim()
    .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
    .default(""),
  status: z.enum(manualMatchStatusOptions, {
    errorMap: () => ({ message: "Status inválido." })
  }).default("SCHEDULED")
});

const updateManualUpcomingMatchSchema = manualUpcomingMatchSchema.extend({
  matchId: z.string().min(1, "Jogo inválido."),
  displayOrder: z.coerce.number().int().min(1, "Ordem inválida.").max(99, "Ordem inválida.")
});

const tvPresentationSettingsSchema = z.object({
  slideIntervalSeconds: z.coerce.number().int().min(5, "O intervalo mínimo é de 5 segundos.").max(120, "O intervalo máximo é de 120 segundos."),
  selectedTournamentId: z.string().trim().default(""),
  selectedRankingIds: z.array(z.string().trim()).default([]),
  showMatches: z.boolean().default(true),
  showCalendar: z.boolean().default(false),
  showSponsors: z.boolean().default(false),
  showRanking: z.boolean().default(false),
  showMonthlyPrize: z.boolean().default(false),
  showNightWinner: z.boolean().default(false),
  monthlyPrizeTitle: z.string().trim().max(80, "Título da premiação muito longo.").default("Premiação mensal"),
  monthlyPrizeAmount: z.string().trim().max(120, "Valor da premiação muito longo.").default("1º - R$200 em crédito da arena"),
  monthlyPrizeDescription: z.string().trim().max(280, "Descrição da premiação muito longa.").default("2º - Um tubo de bolinha + R$50 em crédito da arena | 3Âº - Um grip + R$25 em crédito"),
  nightWinnerTitle: z.string().trim().max(80, "Título do vencedor muito longo.").default("Vencedor da noite"),
  nightWinnerName: z.string().trim().max(80, "Nome do vencedor muito longo.").default("Super 12"),
  nightWinnerDescription: z.string().trim().max(280, "Descrição do vencedor muito longa.").default("Ganha uma vaga cortesia para o Super 12 da próxima semana. O uso é obrigatório na semana seguinte.")
});

const tvSponsorSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do patrocinador.").max(80, "Nome do patrocinador muito longo."),
  subtitle: z.string().trim().max(120, "Título do plano muito longo.").default(""),
  displayOrder: z.coerce.number().int().min(1, "Ordem inválida.").max(99, "Ordem inválida.")
});

async function toInlineLogo(file: File | null) {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo de logo invalido.");
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("A logo deve ter no maximo 4 MB.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function refreshUpcomingMatches() {
  revalidatePath("/proximos-jogos");
  revalidatePath("/proximos-jogos/apresentacao");
  revalidatePath("/proximos-jogos/tv");
}

async function withTvSchemaGuard<T>(callback: () => Promise<T>) {
  try {
    return await callback();
  } catch (error) {
    if (isPrismaSchemaOutdatedError(error)) {
      throw new Error(getMissingTvTablesMessage());
    }

    throw error;
  }
}

export async function createManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const parsed = manualUpcomingMatchSchema.safeParse({
    homePairName: formData.get("homePairName"),
    awayPairName: formData.get("awayPairName"),
    courtName: formData.get("courtName"),
    scheduledTime: formData.get("scheduledTime"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const lastMatch = await prisma.manualUpcomingMatch.findFirst({
    where: {
      arenaId: auth.arenaId
    },
    orderBy: {
      displayOrder: "desc"
    }
  });

  try {
    await prisma.manualUpcomingMatch.create({
      data: {
        arenaId: auth.arenaId,
        displayOrder: (lastMatch?.displayOrder ?? 0) + 1,
        homePairName: parsed.data.homePairName,
        awayPairName: parsed.data.awayPairName,
        courtName: parsed.data.courtName,
        scheduledTime: parsed.data.scheduledTime,
        status: parsed.data.status
      }
    });
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error)) {
      throw error;
    }

    await prisma.manualUpcomingMatch.create({
      data: {
        arenaId: auth.arenaId,
        displayOrder: (lastMatch?.displayOrder ?? 0) + 1,
        homePairName: parsed.data.homePairName,
        awayPairName: parsed.data.awayPairName,
        courtName: parsed.data.courtName,
        scheduledTime: parsed.data.scheduledTime
      }
    });
  }

  refreshUpcomingMatches();
}

export async function updateManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const parsed = updateManualUpcomingMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    displayOrder: formData.get("displayOrder"),
    homePairName: formData.get("homePairName"),
    awayPairName: formData.get("awayPairName"),
    courtName: formData.get("courtName"),
    scheduledTime: formData.get("scheduledTime"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  let updated;

  try {
    updated = await prisma.manualUpcomingMatch.updateMany({
      where: {
        id: parsed.data.matchId,
        arenaId: auth.arenaId
      },
      data: {
        displayOrder: parsed.data.displayOrder,
        homePairName: parsed.data.homePairName,
        awayPairName: parsed.data.awayPairName,
        courtName: parsed.data.courtName,
        scheduledTime: parsed.data.scheduledTime,
        status: parsed.data.status
      }
    });
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error)) {
      throw error;
    }

    updated = await prisma.manualUpcomingMatch.updateMany({
      where: {
        id: parsed.data.matchId,
        arenaId: auth.arenaId
      },
      data: {
        displayOrder: parsed.data.displayOrder,
        homePairName: parsed.data.homePairName,
        awayPairName: parsed.data.awayPairName,
        courtName: parsed.data.courtName,
        scheduledTime: parsed.data.scheduledTime
      }
    });
  }

  if (!updated.count) {
    throw new Error("Jogo não encontrado.");
  }

  refreshUpcomingMatches();
}

export async function deleteManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const matchId = String(formData.get("matchId") ?? "");

  if (!matchId) {
    throw new Error("Jogo inválido.");
  }

  await prisma.manualUpcomingMatch.deleteMany({
    where: {
      id: matchId,
      arenaId: auth.arenaId
    }
  });

  refreshUpcomingMatches();
}

export async function upsertTvPresentationSettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const parsed = tvPresentationSettingsSchema.safeParse({
    slideIntervalSeconds: formData.get("slideIntervalSeconds"),
    selectedTournamentId: formData.get("selectedTournamentId"),
    selectedRankingIds: formData.getAll("selectedRankingIds").map(String).filter(Boolean),
    showMatches: formData.get("showMatches") === "on",
    showCalendar: formData.get("showCalendar") === "on",
    showSponsors: formData.get("showSponsors") === "on",
    showRanking: formData.get("showRanking") === "on",
    showMonthlyPrize: formData.get("showMonthlyPrize") === "on",
    showNightWinner: formData.get("showNightWinner") === "on",
    monthlyPrizeTitle: formData.get("monthlyPrizeTitle"),
    monthlyPrizeAmount: formData.get("monthlyPrizeFirst"),
    monthlyPrizeDescription: [
      String(formData.get("monthlyPrizeSecond") ?? "").trim(),
      String(formData.get("monthlyPrizeThird") ?? "").trim()
    ].filter(Boolean).join(" | "),
    nightWinnerTitle: formData.get("nightWinnerTitle"),
    nightWinnerName: formData.get("nightWinnerName"),
    nightWinnerDescription: formData.get("nightWinnerDescription")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await withTvSchemaGuard(async () => {
    await prisma.tvPresentationSettings.upsert({
      where: {
        arenaId: auth.arenaId
      },
      create: {
        arenaId: auth.arenaId,
        ...parsed.data,
        selectedTournamentId: parsed.data.selectedTournamentId || null
      },
      update: {
        ...parsed.data,
        selectedTournamentId: parsed.data.selectedTournamentId || null
      }
    });
  });

  refreshUpcomingMatches();
}

export async function createTvSponsorAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const parsed = tvSponsorSchema.safeParse({
    name: formData.get("name"),
    subtitle: formData.get("subtitle"),
    displayOrder: formData.get("displayOrder")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const logoFile = formData.get("logo") as File | null;
  const inlineLogo = await toInlineLogo(logoFile);
  const logoUrl = inlineLogo ?? await savePublicImageUpload(logoFile, "tv-sponsor-logos", auth.arenaId);

  await withTvSchemaGuard(async () => {
    await prisma.tvSponsor.create({
      data: {
        arenaId: auth.arenaId,
        ...parsed.data,
        ...(logoUrl ? { logoUrl } : {})
      }
    });
  });

  refreshUpcomingMatches();
}

export async function updateTvSponsorAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const sponsorId = String(formData.get("sponsorId") ?? "");
  const parsed = tvSponsorSchema.safeParse({
    name: formData.get("name"),
    subtitle: formData.get("subtitle"),
    displayOrder: formData.get("displayOrder")
  });

  if (!sponsorId) {
    throw new Error("Patrocinador inválido.");
  }

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const logoFile = formData.get("logo") as File | null;
  const inlineLogo = await toInlineLogo(logoFile);
  const logoUrl = inlineLogo ?? await savePublicImageUpload(logoFile, "tv-sponsor-logos", auth.arenaId);
  const updated = await withTvSchemaGuard(async () =>
    prisma.tvSponsor.updateMany({
      where: {
        id: sponsorId,
        arenaId: auth.arenaId
      },
      data: {
        ...parsed.data,
        ...(logoUrl ? { logoUrl } : {})
      }
    })
  );

  if (!updated?.count) {
    throw new Error("Patrocinador não encontrado.");
  }

  refreshUpcomingMatches();
}

export async function deleteTvSponsorAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const sponsorId = String(formData.get("sponsorId") ?? "");

  if (!sponsorId) {
    throw new Error("Patrocinador inválido.");
  }

  await withTvSchemaGuard(async () => {
    await prisma.tvSponsor.deleteMany({
      where: {
        id: sponsorId,
        arenaId: auth.arenaId
      }
    });
  });

  refreshUpcomingMatches();
}



