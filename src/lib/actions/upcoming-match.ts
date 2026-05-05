"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const courtOptions = ["Agecon", "Elaine", "Origem"] as const;

const manualUpcomingMatchSchema = z.object({
  homePairName: z.string().trim().max(80, "Dupla 1 deve ter no maximo 80 caracteres.").default(""),
  awayPairName: z.string().trim().max(80, "Dupla 2 deve ter no maximo 80 caracteres.").default(""),
  courtName: z.enum(courtOptions, {
    errorMap: () => ({ message: "Quadra inválida." })
  }),
  scheduledTime: z
    .string()
    .trim()
    .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
    .default("")
});

const updateManualUpcomingMatchSchema = manualUpcomingMatchSchema.extend({
  matchId: z.string().min(1, "Jogo inválido."),
  displayOrder: z.coerce.number().int().min(1, "Ordem inválida.").max(99, "Ordem inválida.")
});

function refreshUpcomingMatches() {
  revalidatePath("/proximos-jogos");
  revalidatePath("/proximos-jogos/tv");
}

export async function createManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireModuleEdit("tv");
  const parsed = manualUpcomingMatchSchema.safeParse({
    homePairName: formData.get("homePairName"),
    awayPairName: formData.get("awayPairName"),
    courtName: formData.get("courtName"),
    scheduledTime: formData.get("scheduledTime")
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
    scheduledTime: formData.get("scheduledTime")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const updated = await prisma.manualUpcomingMatch.updateMany({
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
