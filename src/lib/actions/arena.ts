"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { buildArenaProfileUpdateData, slugifyArenaName } from "@/lib/arena-profile";
import { prisma } from "@/lib/prisma";
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

export async function updateAthletePortalSettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const updated = await prisma.arena.update({
    where: { id: auth.arenaId },
    data: {
      athletePortalShowLeagues: formData.get("showLeagues") === "on",
      athletePortalShowBooking: formData.get("showBooking") === "on",
      athletePortalShowReservations: formData.get("showReservations") === "on",
      athletePortalShowLessons: formData.get("showLessons") === "on",
      athletePortalShowClasses: formData.get("showClasses") === "on",
    },
    select: { slug: true },
  });
  revalidatePath("/arena");
  revalidatePath(`/classificacao/${updated.slug}`);
}

async function createUniqueArenaSlug(name: string, arenaId: string) {
  const base = slugifyArenaName(name);
  let slug = base;
  let index = 2;
  while (true) {
    const taken = await prisma.arena.findFirst({ where: { slug, NOT: { id: arenaId } }, select: { id: true } }) ?? await prisma.arenaPublicSlug.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${index++}`;
  }
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
    const currentArena = await prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, name: true } });
    const slug = slugifyArenaName(parsed.data.name) !== currentArena.slug ? await createUniqueArenaSlug(parsed.data.name, auth.arenaId) : currentArena.slug;
    await prisma.$transaction(async (tx) => {
      if (slug !== currentArena.slug) await tx.arenaPublicSlug.upsert({ where: { slug: currentArena.slug }, update: {}, create: { slug: currentArena.slug, arenaId: auth.arenaId } });
      await tx.arena.update({
      where: {
        id: auth.arenaId
      },
      data: { ...await buildArenaProfileUpdateData(parsed.data, formData.get("logo") as File | null), slug }
      });
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
