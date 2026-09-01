"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPublicPlayerSession, destroyPublicPlayerSession } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { resolvePublicClientPlayer } from "@/lib/services/public-client-registration";
import { env } from "@/lib/env";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";

export type PublicClientAuthState = { error: string | null };

const loginSchema = z.object({ arenaSlug: z.string().trim().min(1), returnTo: z.string().trim().default(""), phone: z.string().trim().min(8), password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.") });
const registerSchema = loginSchema.extend({ name: z.string().trim().min(3, "Informe seu nome."), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });
const resetSchema = loginSchema.extend({ code: z.string().trim().length(6), newPassword: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

function normalizePhone(phone: string) { return phone.replace(/\D/g, ""); }
function destination(arenaSlug: string, returnTo: string) { return returnTo.startsWith(`/classificacao/${arenaSlug}`) ? returnTo : `/reservar/${arenaSlug}`; }
function hashCode(code: string) { return crypto.createHash("sha256").update(code).digest("hex"); }
function createCode() { return crypto.randomInt(100000, 1000000).toString(); }

async function sendVerificationCode(arenaId: string, phone: string, purpose: "REGISTER" | "RESET") {
  const code = createCode();
  await prisma.playerVerificationCode.deleteMany({ where: { arenaId, phone, purpose, usedAt: null } });
  await prisma.playerVerificationCode.create({ data: { arenaId, phone, purpose, codeHash: hashCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  await sendEvolutionTextMessage(phone, `Seu código de acesso da Arena é ${code}. Ele expira em 10 minutos.`);
}

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
  if (env.playerPhoneVerificationRequired) {
    await sendVerificationCode(arena.id, phone, "REGISTER");
    return { error: "Enviamos um código ao seu WhatsApp. A confirmação será liberada nesta etapa." };
  }
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
  const phone = normalizePhone(parsed.data.phone);
  const attempt = await prisma.playerAuthAttempt.findUnique({ where: { arenaId_phone: { arenaId: arena.id, phone } } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) return { error: "Muitas tentativas inválidas. Tente novamente em alguns minutos." };
  const account = await findAccountByPhone(arena.id, phone);
  if (!account?.player.active || !await bcrypt.compare(parsed.data.password, account.passwordHash)) {
    const failedCount = (attempt?.lockedUntil && attempt.lockedUntil <= new Date() ? 0 : attempt?.failedCount ?? 0) + 1;
    await prisma.playerAuthAttempt.upsert({ where: { arenaId_phone: { arenaId: arena.id, phone } }, update: { failedCount, lockedUntil: failedCount >= env.loginMaxAttempts ? new Date(Date.now() + env.loginLockMinutes * 60_000) : null }, create: { arenaId: arena.id, phone, failedCount, lockedUntil: failedCount >= env.loginMaxAttempts ? new Date(Date.now() + env.loginLockMinutes * 60_000) : null } });
    return { error: "Telefone ou senha inválidos." };
  }
  await prisma.playerAuthAttempt.deleteMany({ where: { arenaId: arena.id, phone } });
  await createPublicPlayerSession(account.id);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

export async function requestPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  const parsed = loginSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: "", phone: formData.get("phone"), password: "senha-segura" });
  if (!parsed.success) return { error: "Informe um telefone válido." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  const account = arena ? await findAccountByPhone(arena.id, normalizePhone(parsed.data.phone)) : null;
  if (arena && account) await sendVerificationCode(arena.id, normalizePhone(parsed.data.phone), "RESET");
  return { error: "Se existir uma conta para este telefone, enviaremos um código pelo WhatsApp." };
}

export async function confirmPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  const parsed = resetSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: "", phone: formData.get("phone"), code: formData.get("code"), newPassword: formData.get("newPassword"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  const phone = normalizePhone(parsed.data.phone);
  const code = arena ? await prisma.playerVerificationCode.findFirst({ where: { arenaId: arena.id, phone, purpose: "RESET", codeHash: hashCode(parsed.data.code), usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : null;
  const account = arena ? await findAccountByPhone(arena.id, phone) : null;
  if (!code || !account) return { error: "Código inválido ou expirado." };
  await prisma.$transaction([prisma.playerAccount.update({ where: { id: account.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } }), prisma.playerVerificationCode.update({ where: { id: code.id }, data: { usedAt: new Date() } }), prisma.playerSession.deleteMany({ where: { playerAccountId: account.id } })]);
  return { error: "Senha atualizada. Entre com sua nova senha." };
}

export async function logoutPublicClientAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  await destroyPublicPlayerSession();
  redirect(`/reservar/${arenaSlug.success ? arenaSlug.data : ""}`);
}
