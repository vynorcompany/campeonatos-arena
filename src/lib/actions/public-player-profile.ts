"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { savePublicImageUpload } from "@/lib/uploads";

const profileSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  name: z.string().trim().min(3, "Informe seu nome completo."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  email: z.preprocess((value) => value ?? "", z.string().trim().email("E-mail inválido.").or(z.literal(""))),
  birthDate: z.preprocess((value) => value || null, z.coerce.date().nullable()),
});

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export type PublicProfileActionState = { error: string | null; success: string | null };

export async function updatePublicPlayerProfileAction(_: PublicProfileActionState, formData: FormData): Promise<PublicProfileActionState> {
  const parsed = profileSchema.safeParse({
    arenaSlug: formData.get("arenaSlug"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };

  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const phone = normalizePhone(parsed.data.phone);
  const photoUrl = await savePublicImageUpload(formData.get("photo") as File | null, "player-photos", auth.arenaId);
  const conflictingAccount = await prisma.playerAccount.findFirst({ where: { arenaId: auth.arenaId, phone, playerId: { not: auth.playerId } }, select: { id: true } });
  if (conflictingAccount) return { error: "Este telefone já está vinculado a outro cliente.", success: null };

  await prisma.$transaction(async (tx) => {
    await tx.player.update({ where: { id: auth.playerId }, data: { name: parsed.data.name, phone, email: parsed.data.email, birthDate: parsed.data.birthDate, ...(photoUrl ? { photoUrl } : {}) } });
    await tx.playerAccount.update({ where: { id: auth.playerAccountId }, data: { phone } });
    const student = await tx.student.findFirst({ where: { playerId: auth.playerId }, select: { id: true } });
    if (student) await tx.student.update({ where: { id: student.id }, data: { name: parsed.data.name, phone, email: parsed.data.email } });
    const teacher = await tx.teacher.findUnique({ where: { playerId: auth.playerId }, select: { id: true } });
    if (teacher) await tx.teacher.update({ where: { id: teacher.id }, data: { name: parsed.data.name, phone, email: parsed.data.email } });
  });

  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
  revalidatePath("/jogadores");
  revalidatePath("/professores");
  return { error: null, success: "Perfil atualizado com sucesso." };
}
