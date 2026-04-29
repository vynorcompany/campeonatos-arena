"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const manualUpcomingMatchSchema = z.object({
  homePairName: z.string().trim().max(80, "Dupla 1 deve ter no maximo 80 caracteres.").default(""),
  awayPairName: z.string().trim().max(80, "Dupla 2 deve ter no maximo 80 caracteres.").default(""),
  courtName: z.string().trim().max(80, "Quadra deve ter no maximo 80 caracteres.").default("")
});

const updateManualUpcomingMatchSchema = manualUpcomingMatchSchema.extend({
  matchId: z.string().min(1, "Jogo invalido."),
  displayOrder: z.coerce.number().int().min(1, "Ordem invalida.").max(99, "Ordem invalida.")
});

function refreshUpcomingMatches() {
  revalidatePath("/proximos-jogos");
}

export async function createManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const parsed = manualUpcomingMatchSchema.safeParse({
    homePairName: formData.get("homePairName"),
    awayPairName: formData.get("awayPairName"),
    courtName: formData.get("courtName")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
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
      courtName: parsed.data.courtName
    }
  });

  refreshUpcomingMatches();
}

export async function updateManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const parsed = updateManualUpcomingMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    displayOrder: formData.get("displayOrder"),
    homePairName: formData.get("homePairName"),
    awayPairName: formData.get("awayPairName"),
    courtName: formData.get("courtName")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
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
      courtName: parsed.data.courtName
    }
  });

  if (!updated.count) {
    throw new Error("Jogo nao encontrado.");
  }

  refreshUpcomingMatches();
}

export async function deleteManualUpcomingMatchAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const matchId = String(formData.get("matchId") ?? "");

  if (!matchId) {
    throw new Error("Jogo invalido.");
  }

  await prisma.manualUpcomingMatch.deleteMany({
    where: {
      id: matchId,
      arenaId: auth.arenaId
    }
  });

  refreshUpcomingMatches();
}
