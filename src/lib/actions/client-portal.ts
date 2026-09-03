"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const announcementSchema = z.object({ title: z.string().trim().min(2, "Informe o título."), message: z.string().trim().min(2, "Informe o aviso."), startsAt: z.string().trim().default(""), endsAt: z.string().trim().default("") });

async function refreshPortal(arenaId: string) {
  const arena = await prisma.arena.findUnique({ where: { id: arenaId }, select: { slug: true } });
  revalidatePath("/arena/portal-cliente");
  if (arena) revalidatePath(`/classificacao/${arena.slug}`);
}

export async function createPortalAnnouncementAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const parsed = announcementSchema.safeParse({ title: formData.get("title"), message: formData.get("message"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await prisma.portalAnnouncement.create({ data: { arenaId: auth.arenaId, title: parsed.data.title, message: parsed.data.message, startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null, endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null } });
  await refreshPortal(auth.arenaId);
}

export async function togglePortalAnnouncementAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const id = String(formData.get("announcementId") ?? "");
  const current = await prisma.portalAnnouncement.findFirst({ where: { id, arenaId: auth.arenaId }, select: { active: true } });
  if (!current) throw new Error("Aviso não encontrado.");
  await prisma.portalAnnouncement.update({ where: { id }, data: { active: !current.active } });
  await refreshPortal(auth.arenaId);
}

export async function togglePortalEventFeatureAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const id = String(formData.get("calendarEventId") ?? "");
  const current = await prisma.calendarEvent.findFirst({ where: { id, arenaId: auth.arenaId }, select: { featuredInPortal: true } });
  if (!current) throw new Error("Evento não encontrado.");
  await prisma.calendarEvent.update({ where: { id }, data: { featuredInPortal: !current.featuredInPortal } });
  await refreshPortal(auth.arenaId);
}
