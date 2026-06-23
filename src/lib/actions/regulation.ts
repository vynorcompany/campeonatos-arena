"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type RegulationActionState = {
  error: string | null;
  success: string | null;
  publicUrl?: string;
  publicSlug?: string;
};

const documentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(10, "Escreva o regulamento antes de publicar.")
    .max(20000, "O regulamento ficou grande demais.")
});

const acceptanceSchema = z.object({
  regulationDocumentId: z.string().trim().min(1, "Regulamento inválido."),
  accepted: z.string().optional().refine((value) => value === "on", {
    message: "Marque a caixa de aceite para continuar."
  })
});

function buildPublicRegulationUrl(slug: string) {
  const baseUrl = env.appUrl ?? "http://localhost:3000";
  return new URL(`/regulamento/${slug}`, baseUrl).toString();
}

function refreshRegulationRoutes(slug?: string) {
  revalidatePath("/arena/regulamento");
  revalidatePath("/arena");

  if (slug) {
    revalidatePath(`/regulamento/${slug}`);
  }
}

function createPublicSlug() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function createRegulationDocumentAction(_: RegulationActionState, formData: FormData): Promise<RegulationActionState> {
  const auth = await requireModuleEdit("arena");
  const parsed = documentSchema.safeParse({
    content: formData.get("content")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null
    };
  }

  const regulation = await prisma.regulationDocument.create({
    data: {
      arenaId: auth.arenaId,
      createdById: auth.userId,
      content: parsed.data.content,
      publicSlug: createPublicSlug()
    }
  });

  const publicUrl = buildPublicRegulationUrl(regulation.publicSlug);
  refreshRegulationRoutes(regulation.publicSlug);

  return {
    error: null,
    success: "Regulamento publicado com sucesso.",
    publicSlug: regulation.publicSlug,
    publicUrl
  };
}

export async function acceptRegulationDocumentAction(_: RegulationActionState, formData: FormData): Promise<RegulationActionState> {
  const parsed = acceptanceSchema.safeParse({
    regulationDocumentId: formData.get("regulationDocumentId"),
    accepted: formData.get("accepted")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null
    };
  }

  const regulation = await prisma.regulationDocument.findFirst({
    where: {
      id: parsed.data.regulationDocumentId,
      active: true
    },
    select: {
      id: true,
      publicSlug: true,
      content: true,
      arena: {
        select: {
          id: true
        }
      }
    }
  });

  if (!regulation) {
    return {
      error: "Regulamento não encontrado ou indisponível.",
      success: null
    };
  }

  await prisma.regulationAcceptance.create({
    data: {
      arenaId: regulation.arena.id,
      content: regulation.content,
      regulationDocumentId: regulation.id
    }
  });

  refreshRegulationRoutes(regulation.publicSlug);

  return {
    error: null,
    success: "Regulamento aceito com sucesso."
  };
}
