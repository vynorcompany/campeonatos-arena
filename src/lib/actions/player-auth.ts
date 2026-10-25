"use server";
import { legalVersion } from "@/lib/legal/version";
import { playerReturnPath } from "@/lib/auth/player-return-path";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPublicPlayerSession, destroyPublicPlayerSession } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { resolvePublicClientPlayer } from "@/lib/services/public-client-registration";
import { env } from "@/lib/env";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { activeLoginLock, clearLoginFailures, recordFailedLogin } from "@/lib/auth/login-attempts";
import { withArenaTransaction } from "@/lib/rls";

export type PublicClientAuthState = { error: string | null; notice?: string; requested?: boolean; phone?: string };

const loginSchema = z.object({ arenaSlug: z.string().trim().min(1), returnTo: z.string().trim().default(""), phone: z.string().trim().min(8), password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.") });
const globalLoginSchema = z.object({ phone: z.string().trim().min(8), password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.") });
const registerSchema = loginSchema.extend({ name: z.string().trim().min(3, "Informe nome e sobrenome.").refine((name) => name.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome."), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });
const registrationCodeSchema = z.string().trim().regex(/^\d{6}$/, "Informe o código de 6 dígitos.");
const resetSchema = z.object({ arenaSlug: z.string().trim().min(1), phone: z.string().trim().min(8), code: z.string().trim().length(6), newPassword: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

function normalizePhone(phone: string) { return normalizeBrazilianPhone(phone); }
function destination(arenaSlug: string, returnTo: string) { return playerReturnPath(arenaSlug, returnTo); }
function hashCode(code: string) { return crypto.createHash("sha256").update(code).digest("hex"); }
function createCode() { return crypto.randomInt(100000, 1000000).toString(); }

async function sendVerificationCode(arenaId: string, phone: string, purpose: "REGISTER" | "RESET") {
  const recentCode = await prisma.playerVerificationCode.findFirst({ where: { arenaId, phone, purpose, usedAt: null, attempts: { lt: 5 }, createdAt: { gte: new Date(Date.now() - 60_000) }, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (recentCode) return;
  const issuedLastHour = await prisma.playerVerificationCode.count({ where: { arenaId, phone, purpose, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
  if (issuedLastHour >= 5) throw new Error("Limite de códigos atingido. Aguarde antes de tentar novamente.");
  const code = createCode();
  await prisma.playerVerificationCode.updateMany({ where: { arenaId, phone, purpose, usedAt: null }, data: { usedAt: new Date() } });
  const verification = await prisma.playerVerificationCode.create({ data: { arenaId, phone, purpose, codeHash: hashCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  try {
    await sendEvolutionTextMessage(phone, `Seu código de acesso da Arena é ${code}. Ele expira em 10 minutos.`, arenaId);
  } catch (error) {
    await prisma.playerVerificationCode.delete({ where: { id: verification.id } });
    throw error;
  }
}

const resetRequestNotice = "Se existir uma conta para este telefone, enviaremos um código pelo WhatsApp.";
const resetDeliveryError = "Não foi possível enviar o código agora. Verifique a conexão do WhatsApp da arena e tente novamente.";

async function finishPasswordReset(account: { id: string; identityId: string | null }, passwordHash: string, codeId: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.playerVerificationCode.updateMany({ where: { id: codeId, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { usedAt: new Date() } });
    if (!claimed.count) return false;
    if (account.identityId) {
      const linkedAccounts = await tx.playerAccount.findMany({ where: { identityId: account.identityId }, select: { id: true } });
      await tx.athleteIdentity.update({ where: { id: account.identityId }, data: { passwordHash } });
      await tx.playerAccount.updateMany({ where: { identityId: account.identityId }, data: { passwordHash } });
      await tx.playerSession.deleteMany({ where: { OR: [{ athleteIdentityId: account.identityId }, { playerAccountId: { in: linkedAccounts.map((linked) => linked.id) } }] } });
    } else {
      await tx.playerAccount.update({ where: { id: account.id }, data: { passwordHash } });
      await tx.playerSession.deleteMany({ where: { playerAccountId: account.id } });
    }
    return true;
  });
}

async function latestResetCode(arenaIds: string[], phone: string) {
  if (!arenaIds.length) return null;
  return prisma.playerVerificationCode.findFirst({ where: { arenaId: { in: arenaIds }, phone, purpose: "RESET", usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, orderBy: { createdAt: "desc" } });
}

async function resetCodeMatches(code: { id: string; codeHash: string } | null, suppliedCode: string) {
  if (!code) return false;
  if (code.codeHash === hashCode(suppliedCode)) return true;
  await prisma.playerVerificationCode.updateMany({ where: { id: code.id, usedAt: null, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
  return false;
}

async function findPlayerByPhone(arenaId: string, phone: string) {
  const players = await withArenaTransaction(arenaId, (tx) => tx.player.findMany({ where: { arenaId, active: true, phone: { not: "" } }, include: { account: true }, orderBy: { createdAt: "asc" } }));
  return resolvePublicClientPlayer(players, phone);
}

async function findAccountByPhone(arenaId: string, phone: string) {
  const canonicalPhone = normalizePhone(phone);
  return withArenaTransaction(arenaId, async (tx) => {
    const account = await tx.playerAccount.findUnique({ where: { arenaId_phone: { arenaId, phone: canonicalPhone } }, include: { player: true, identity: { include: { accounts: { select: { id: true, passwordHash: true } } } } } });
    if (account) return account;
    const legacyAccounts = await tx.playerAccount.findMany({ where: { arenaId }, include: { player: true, identity: { include: { accounts: { select: { id: true, passwordHash: true } } } } }, orderBy: { createdAt: "asc" } });
    return legacyAccounts.find((candidate) => normalizePhone(candidate.phone) === normalizePhone(phone)) ?? null;
  });
}

async function findGlobalIdentityByPhone(phone: string) {
  return prisma.athleteIdentity.findUnique({ where: { phone: normalizePhone(phone) }, include: { accounts: { select: { id: true, passwordHash: true } } } });
}

async function matchesIdentityPassword(identity: { passwordHash: string; accounts: Array<{ passwordHash: string }> }, password: string) {
  if (await bcrypt.compare(password, identity.passwordHash)) return true;
  for (const account of identity.accounts) if (await bcrypt.compare(password, account.passwordHash)) return true;
  return false;
}

export async function registerPublicClientAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  if (formData.get("termsAccepted") !== "on" || formData.get("legalVersion") !== legalVersion) return { error: "Leia e aceite a versão atual dos Termos de Uso e consulte a Política de Privacidade para criar a conta." };
  const parsed = registerSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: formData.get("returnTo"), name: formData.get("name"), phone: formData.get("phone"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const phone = normalizePhone(parsed.data.phone);
  if (phone.length < 10) return { error: "Informe um telefone válido." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) return { error: "Arena não encontrada." };
  const existingAccount = await findAccountByPhone(arena.id, phone);
  if (existingAccount) return { error: "Este telefone já possui uma conta. Entre com sua senha." };
  const identity = await findGlobalIdentityByPhone(phone);
  if (identity && !await matchesIdentityPassword(identity, parsed.data.password)) return { error: "Este telefone já possui uma Conta do Atleta. Use a senha que você já utiliza em outra arena." };
  if (env.playerPhoneVerificationRequired) {
    try {
      await sendVerificationCode(arena.id, phone, "REGISTER");
    } catch {
      return { error: "Não foi possível enviar o código. Verifique o WhatsApp da arena e tente novamente." };
    }
    return { error: null, notice: "Enviamos um código de 6 dígitos ao seu WhatsApp.", requested: true, phone };
  }
  const player = await findPlayerByPhone(arena.id, phone);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const account = await withArenaTransaction(arena.id, async (tx) => {
    const linkedPlayer = player ?? await tx.player.create({ data: { arenaId: arena.id, name: parsed.data.name, phone } });
    const athleteIdentity = identity ?? await tx.athleteIdentity.create({ data: { phone, passwordHash } });
    return tx.playerAccount.create({ data: { arenaId: arena.id, phone, playerId: linkedPlayer.id, passwordHash, identityId: athleteIdentity.id, termsAcceptedAt: new Date(), termsVersion: legalVersion, privacyNoticeVersion: legalVersion } });
  });
  await createPublicPlayerSession(account.id, account.identityId);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

export async function confirmPublicClientRegistrationAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  if (formData.get("termsAccepted") !== "on" || formData.get("legalVersion") !== legalVersion) return { error: "Leia e aceite a versão atual dos Termos de Uso e consulte a Política de Privacidade para criar a conta." };
  const parsed = registerSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: formData.get("returnTo"), name: formData.get("name"), phone: formData.get("phone"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  const parsedCode = registrationCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!parsedCode.success) return { error: parsedCode.error.issues[0]?.message ?? "Código inválido." };
  if (!env.playerPhoneVerificationRequired) return { error: "A confirmação por código não está ativa nesta arena." };
  const phone = normalizePhone(parsed.data.phone);
  if (phone.length < 10) return { error: "Informe um telefone válido." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) return { error: "Arena não encontrada." };
  if (await findAccountByPhone(arena.id, phone)) return { error: "Este telefone já possui uma conta. Entre com sua senha." };
  const identity = await findGlobalIdentityByPhone(phone);
  if (identity && !await matchesIdentityPassword(identity, parsed.data.password)) return { error: "Use a senha da Conta do Atleta já vinculada a este telefone." };
  const verification = await prisma.playerVerificationCode.findFirst({ where: { arenaId: arena.id, phone, purpose: "REGISTER", usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, orderBy: { createdAt: "desc" }, select: { id: true, codeHash: true } });
  if (!verification) return { error: "Código expirado ou limite de tentativas atingido. Solicite outro." };
  if (verification.codeHash !== hashCode(parsedCode.data)) {
    await prisma.playerVerificationCode.updateMany({ where: { id: verification.id, usedAt: null, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
    return { error: "Código inválido ou expirado." };
  }
  const player = await findPlayerByPhone(arena.id, phone);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const account = await withArenaTransaction(arena.id, async (tx) => {
    const claim = await tx.playerVerificationCode.updateMany({ where: { id: verification.id, arenaId: arena.id, phone, purpose: "REGISTER", codeHash: verification.codeHash, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { usedAt: new Date() } });
    if (!claim.count) return null;
    if (await tx.playerAccount.findUnique({ where: { arenaId_phone: { arenaId: arena.id, phone } }, select: { id: true } })) return null;
    const linkedPlayer = player ?? await tx.player.create({ data: { arenaId: arena.id, name: parsed.data.name, phone } });
    const athleteIdentity = identity ?? await tx.athleteIdentity.create({ data: { phone, passwordHash } });
    return tx.playerAccount.create({ data: { arenaId: arena.id, phone, playerId: linkedPlayer.id, passwordHash, identityId: athleteIdentity.id, termsAcceptedAt: new Date(), termsVersion: legalVersion, privacyNoticeVersion: legalVersion } });
  });
  if (!account) return { error: "Este código já foi utilizado. Solicite outro ou entre na sua conta." };
  await createPublicPlayerSession(account.id, account.identityId);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

export async function loginPublicClientAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const parsed = loginSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: formData.get("returnTo"), phone: formData.get("phone"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  if (!arena) return { error: "Arena não encontrada." };
  const phone = normalizePhone(parsed.data.phone);
  const attemptKey = `athlete:${phone}`;
  const legacyAttempt = await prisma.playerAuthAttempt.findUnique({ where: { arenaId_phone: { arenaId: arena.id, phone } }, select: { lockedUntil: true } });
  if ((legacyAttempt?.lockedUntil && legacyAttempt.lockedUntil > new Date()) || await activeLoginLock(attemptKey)) return { error: "Muitas tentativas inválidas. Tente novamente em alguns minutos." };
  const account = await findAccountByPhone(arena.id, phone);
  if (!account?.player.active || !await bcrypt.compare(parsed.data.password, account.passwordHash)) {
    await recordFailedLogin(attemptKey);
    return { error: "Telefone ou senha inválidos." };
  }
  await clearLoginFailures(attemptKey);
  await prisma.playerAuthAttempt.deleteMany({ where: { arenaId: arena.id, phone } });
  await createPublicPlayerSession(account.id, account.identityId);
  redirect(destination(parsed.data.arenaSlug, parsed.data.returnTo));
}

// The neutral portal is intentionally global. It authenticates the person once
// and lets the arena route resolve the tenant-specific PlayerAccount afterwards.
export async function loginGlobalAthleteAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const parsed = globalLoginSchema.safeParse({ phone: formData.get("phone"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const attemptKey = `athlete:${normalizePhone(parsed.data.phone)}`;
  if (await activeLoginLock(attemptKey)) return { error: "Muitas tentativas inválidas. Tente novamente em alguns minutos." };
  const identity = await findGlobalIdentityByPhone(parsed.data.phone);
  if (!identity?.accounts.length || !await matchesIdentityPassword(identity, parsed.data.password)) {
    await recordFailedLogin(attemptKey);
    return { error: "Telefone ou senha inválidos." };
  }
  await clearLoginFailures(attemptKey);
  await createPublicPlayerSession(identity.accounts[0].id, identity.id);
  redirect("/portal");
}

export async function requestGlobalPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (phone.length < 10) return { error: "Informe um telefone válido." };
  const accounts = await prisma.playerAccount.findMany({ where: { phone }, select: { arenaId: true }, orderBy: { createdAt: "asc" } });
  if (accounts.length) {
    const connections = await Promise.all(accounts.map(account => withArenaTransaction(account.arenaId, tx => tx.whatsAppConnection.findFirst({ where: { arenaId: account.arenaId, status: "CONNECTED" }, select: { arenaId: true, updatedAt: true } }))));
    const connection = connections.filter((entry): entry is NonNullable<typeof entry> => entry !== null).sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))[0];
    try {
      await sendVerificationCode(connection?.arenaId ?? accounts[0].arenaId, phone, "RESET");
    } catch {
      return { error: resetDeliveryError };
    }
  }
  return { error: null, notice: resetRequestNotice, requested: true, phone };
}

export async function confirmGlobalPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (phone.length < 10 || !/^\d{6}$/.test(code) || newPassword.length < 8 || newPassword !== confirmPassword) return { error: "Revise telefone, código e senha." };
  const accounts = await prisma.playerAccount.findMany({ where: { phone }, select: { id: true, arenaId: true, identityId: true } });
  const resetCode = await latestResetCode(accounts.map((account) => account.arenaId), phone);
  const account = accounts.find((candidate) => candidate.arenaId === resetCode?.arenaId);
  if (!account || !resetCode || !await resetCodeMatches(resetCode, code)) return { error: "Código inválido ou expirado." };
  const passwordHash = await bcrypt.hash(newPassword, 12);
  if (!await finishPasswordReset(account, passwordHash, resetCode.id)) return { error: "Código inválido ou expirado." };
  return { error: null, notice: "Senha atualizada. Entre com sua nova senha." };
}

export async function requestPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const parsed = loginSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), returnTo: "", phone: formData.get("phone"), password: "senha-segura" });
  if (!parsed.success) return { error: "Informe um telefone válido." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  const account = arena ? await findAccountByPhone(arena.id, normalizePhone(parsed.data.phone)) : null;
  const phone = normalizePhone(parsed.data.phone);
  if (arena && account) {
    try {
      await sendVerificationCode(arena.id, phone, "RESET");
    } catch {
      return { error: resetDeliveryError };
    }
  }
  return { error: null, notice: resetRequestNotice, requested: true, phone };
}

export async function confirmPublicPasswordResetAction(_: PublicClientAuthState, formData: FormData): Promise<PublicClientAuthState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const parsed = resetSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), phone: formData.get("phone"), code: formData.get("code"), newPassword: formData.get("newPassword"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true } });
  const phone = normalizePhone(parsed.data.phone);
  const code = await latestResetCode(arena ? [arena.id] : [], phone);
  const account = arena ? await findAccountByPhone(arena.id, phone) : null;
  if (!account || !code || !await resetCodeMatches(code, parsed.data.code)) return { error: "Código inválido ou expirado." };
  if (!await finishPasswordReset(account, await bcrypt.hash(parsed.data.newPassword, 12), code.id)) return { error: "Código inválido ou expirado." };
  return { error: null, notice: "Senha atualizada. Entre com sua nova senha." };
}

export async function logoutPublicClientAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  await destroyPublicPlayerSession();
  redirect(`/reservar/${arenaSlug.success ? arenaSlug.data : ""}`);
}

export async function logoutAthletePortalAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  await destroyPublicPlayerSession();
  redirect(arenaSlug.success ? `/classificacao/${encodeURIComponent(arenaSlug.data)}` : "/portal");
}
