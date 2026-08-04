"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { toPersistentArenaLogo } from "@/lib/uploads";
import type { ActionState } from "@/lib/actions/tournament";

const arenaProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da arena."),
  legalName: z.string().trim().max(120).default(""),
  cnpj: z.string().trim().max(32).default(""),
  phone: z.string().trim().max(32).default(""),
  email: z.string().trim().email("Informe um e-mail válido.").or(z.literal("")).default(""),
  address: z.string().trim().max(160).default(""),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(32).default(""),
  zipCode: z.string().trim().max(24).default("")
});

function refreshArenaRoutes() {
  revalidatePath("/arena");
  revalidatePath("/painel");
  revalidatePath("/proximos-jogos/tv");
}

export async function updateArenaProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("arena");
  const parsed = arenaProfileSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    cnpj: formData.get("cnpj"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipCode: formData.get("zipCode")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    const logoUrl = await toPersistentArenaLogo(formData.get("logo") as File | null);

    await prisma.arena.update({
      where: {
        id: auth.arenaId
      },
      data: {
        ...parsed.data,
        ...(logoUrl ? { logoUrl } : {})
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível atualizar a arena.",
      success: null
    };
  }

  refreshArenaRoutes();
  return { error: null, success: "Dados da arena atualizados com sucesso." };
}
