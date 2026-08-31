"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPublicPlayerSession, destroyPublicPlayerSession } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { resolvePublicClientPlayer } from "@/lib/services/public-client-registration";

export type PublicClientAuthState = { error: string | null };

const loginSchema = z.object({ arenaSlug: z.string().trim().min(1), returnTo: z.string().trim().default(""), phone: z.string().trim().min(8), password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.") });
const registerSchema = loginSchema.extend({ name: z.string().trim().min(3, "Informe seu nome."), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

function normalizePhone(phone: string) { return phone.replace(/\D/g, ""); }
function destination(arenaSlug: string, returnTo: string) { return returnTo.startsWith(`/classificacao/${arenaSlug}`) ? returnTo : `/reservar/${arenaSlug}`; }

async function findPlayerByPhone(arenaId: string, phone: string) {
  const players = await prisma.player.findMany({ where: { arenaId, active: true, phone: { not: "" } }, include: { account: true }, orderBy: { createdAt: "asc" } });
  return resolvePublicClientPlayer(players, phone);
}

async function findAccountByPhone(arenaId: string, phone: string) {
  const canonicalPhone = normalizePhone(phone);
  const account = await prisma.playerAccount.findUnique({ where: { arenaId_phone: { arenaId, phone: canonicalPhone } }, include: { player: true } });
  if (account) return account;

  const legacyAccounts = await prisma.playerAccount.findMany({ where: { arenaId }, include: { player: true }, orderBy: { createdAt: "asc" } });
  return legacyAccounts.find((account) => normalizePhone(account.phone) === normalizePhone(phone)) ?? null;
}

export async function registerPublicClientAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  const parsed = registerSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: formData.get("returnTo"), name: formData.get("name"), phone: formData.get("phone"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const phone = normalizePhone(parsed.data.phone);
  if (phone.length < 10) return { error: "Informe um telefone válido." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) return { error: "Arena não encontrada." };
  const existingAccount = await findAccountByPhone(arena.id, phone);
  if (existingAccount) return { error: "Este telefone já possui uma conta. Entre com sua senha." };
  const player = await findPlayerByPhone(arena.id, phone);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const account = await prisma.$transaction(async (tx) => {
    const linkedPlayer = player ?? await tx.player.create({ data: { arenaId: arena.id, name: parsed.data.name, phone } });
    return tx.playerAccount.create({ data: { arenaId: arena.id, phone, playerId: linkedPlayer.id, passwordHash } });
  });
  await createPublicPlayerSession(account.id);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

export async function loginPublicClientAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  const parsed = loginSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: formData.get("returnTo"), phone: formData.get("phone"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) return { error: "Arena não encontrada." };
  const account = await findAccountByPhone(arena.id, normalizePhone(parsed.data.phone));
  if (!account?.player.active || !await bcrypt.compare(parsed.data.password, account.passwordHash)) return { error: "Telefone ou senha inválidos." };
  await createPublicPlayerSession(account.id);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

export async function logoutPublicClientAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  await destroyPublicPlayerSession();
  redirect(`/reservar/${arenaSlug.success ? arenaSlug.data : ""}`);
}
