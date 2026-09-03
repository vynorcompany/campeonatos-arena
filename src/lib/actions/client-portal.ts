"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { saveOptimizedPortalEventImageUpload } from "@/lib/uploads";

const announcementSchema = z.object({ title: z.string().trim().min(2, "Informe o título."), message: z.string().trim().min(2, "Informe o aviso."), startsAt: z.string().trim().default(""), endsAt: z.string().trim().default("") });

async function refreshPortal(arenaId: string) {
  const arena = await prisma.arena.findUnique({ where: { id: arenaId }, select: { slug: true } });
  revalidatePath("/arena");
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
  const updated = await prisma.portalAnnouncement.updateMany({ where: { id, arenaId: auth.arenaId }, data: { active: !current.active } });
  if (!updated.count) throw new Error("Aviso não encontrado.");
  await refreshPortal(auth.arenaId);
}

export async function togglePortalEventFeatureAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const id = String(formData.get("calendarEventId") ?? "");
  const current = await prisma.calendarEvent.findFirst({ where: { id, arenaId: auth.arenaId }, select: { featuredInPortal: true } });
  if (!current) throw new Error("Evento não encontrado.");
  const updated = await prisma.calendarEvent.updateMany({ where: { id, arenaId: auth.arenaId }, data: { featuredInPortal: !current.featuredInPortal } });
  if (!updated.count) throw new Error("Evento não encontrado.");
  await refreshPortal(auth.arenaId);
}

export async function createPortalEventPostAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const title = String(formData.get("title") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const image = formData.get("image") as File | null;
  if (title.length < 2) throw new Error("Informe o título do evento.");
  if (!image?.size || !image.type.startsWith("image/")) throw new Error("Envie uma imagem válida para o evento.");
  const imageUrl = await saveOptimizedPortalEventImageUpload(image, auth.arenaId);
  if (!imageUrl) throw new Error("Não foi possível salvar a imagem.");
  await prisma.portalEventPost.create({ data: { arenaId: auth.arenaId, title, caption, imageUrl } });
  await refreshPortal(auth.arenaId);
}

export async function replacePortalEventPostImageAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const id = String(formData.get("eventPostId") ?? "").trim();
  const image = formData.get("image") as File | null;
  if (!id) throw new Error("Evento não encontrado.");
  if (!image?.size || !image.type.startsWith("image/")) throw new Error("Envie uma imagem válida para o evento.");

  const post = await prisma.portalEventPost.findFirst({ where: { id, arenaId: auth.arenaId }, select: { id: true } });
  if (!post) throw new Error("Evento não encontrado.");
  const imageUrl = await saveOptimizedPortalEventImageUpload(image, auth.arenaId, `event-${post.id}`);
  if (!imageUrl) throw new Error("Não foi possível salvar a imagem.");

  await prisma.portalEventPost.updateMany({ where: { id: post.id, arenaId: auth.arenaId }, data: { imageUrl } });
  await refreshPortal(auth.arenaId);
}
