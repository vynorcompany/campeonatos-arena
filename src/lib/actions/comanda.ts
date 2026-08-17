"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const comandaSchema = z.object({
  type: z.enum(["CLIENT", "AVULSA"]),
  playerId: z.string().trim().optional(),
  label: z.string().trim().max(80).optional()
});

function formatComandaCode() {
  return `CMD-${Date.now().toString(36).toUpperCase()}`;
}

export async function createComandaAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = comandaSchema.safeParse({
    type: formData.get("type"),
    playerId: formData.get("playerId") || undefined,
    label: formData.get("label") || undefined
  });

  if (!parsed.success) {
    throw new Error("Dados da comanda inválidos.");
  }

  let player: { id: string; name: string } | null = null;
  if (parsed.data.type === "CLIENT") {
    if (!parsed.data.playerId) {
      throw new Error("Selecione o cliente da comanda.");
    }

    player = await prisma.player.findFirst({
      where: { id: parsed.data.playerId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true }
    });

    if (!player) {
      throw new Error("Cliente não encontrado.");
    }
  }

  const label = parsed.data.type === "CLIENT" ? player!.name : parsed.data.label;
  if (!label) {
    throw new Error("Informe um nome para a comanda avulsa.");
  }

  await prisma.comanda.create({
    data: {
      arenaId: auth.arenaId,
      playerId: player?.id,
      code: formatComandaCode(),
      label,
      type: parsed.data.type
    }
  });

  revalidatePath("/comandas");
}
