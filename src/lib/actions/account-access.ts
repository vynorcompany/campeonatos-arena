"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArenaAccess } from "@/lib/auth/session";
import { accountEmailIsConfigured, sendAccountEmail } from "@/lib/auth/account-email";
import { createAccountToken, hashAccountToken } from "@/lib/auth/account-tokens";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { inviteArenaUserSchema } from "@/lib/validators/user";

export type AccountAccessState = { error: string | null; success: string | null; invitationUrl?: string };
const emailSchema = z.string().trim().email("Informe um e-mail válido.");
const passwordSchema = z.string().min(10, "A senha deve ter pelo menos 10 caracteres.");
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);
const genericResetMessage = "Se este e-mail estiver cadastrado, enviaremos um link de recuperação válido por 30 minutos.";

function accountUrl(path: string, token: string) {
  if (!env.appUrl) return `${path}?${new URLSearchParams({ token })}`;
  const url = new URL(path, env.appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function inviteArenaUserAction(_: AccountAccessState, formData: FormData): Promise<AccountAccessState> {
  const auth = await requireArenaAccess();
  if (auth.arenaRole !== "OWNER" && auth.arenaRole !== "ADMIN" && !["ADMIN", "SUPER_ADMIN"].includes(auth.systemRole)) return { error: "Sem permissão para convidar usuários.", success: null };
  const parsed = inviteArenaUserSchema.safeParse({ email: formData.get("email"), name: formData.get("name"), permissionProfileId: formData.get("permissionProfileId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  const email = parsed.data.email.toLowerCase();
  const [profile, existingUser, arena, recentInvites] = await Promise.all([
    prisma.permissionProfile.findFirst({ where: { id: parsed.data.permissionProfileId, arenaId: auth.arenaId, active: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true, memberships: { where: { arenaId: auth.arenaId }, select: { id: true } } } }),
    prisma.arena.findUnique({ where: { id: auth.arenaId }, select: { name: true } }),
    prisma.accountActionToken.count({ where: { email, arenaId: auth.arenaId, kind: "INVITE", createdAt: { gt: new Date(Date.now() - 60 * 60_000) } } })
  ]);
  if (!profile || !arena) return { error: "Perfil ou arena indisponível.", success: null };
  if (existingUser?.memberships.length) return { error: "Esse usuário já tem acesso à arena.", success: null };
  if (recentInvites >= 3) return { error: "Aguarde antes de enviar outro convite para este e-mail.", success: null };
  const { token } = await createAccountToken({ kind: "INVITE", email, name: parsed.data.name, arenaId: auth.arenaId, profileId: profile.id, arenaRole: "STAFF", hoursValid: 48 });
  const invitationUrl = accountUrl("/convite", token);
  const manualInvite = (success: string): AccountAccessState => ({ error: null, success, invitationUrl });
  revalidatePath("/usuarios");
  if (!accountEmailIsConfigured()) return manualInvite("Convite criado. Copie o link e compartilhe com o usuário para ele definir a própria senha. O link expira em 48 horas.");
  try {
    await sendAccountEmail(email, `Convite para acessar ${arena.name}`, `Olá, ${parsed.data.name}. Você recebeu um convite para acessar ${arena.name} no Arena Padel Manager. Abra ${accountUrl("/convite", token)} em até 48 horas. Se não esperava este convite, ignore esta mensagem.`);
  } catch {
    return manualInvite("O e-mail não pôde ser enviado, mas o convite foi criado. Copie o link e compartilhe com o usuário. O link expira em 48 horas.");
  }
  revalidatePath("/usuarios");
  return { error: null, success: "Convite enviado. O usuário receberá um link para criar o acesso à arena." };
}

export async function revokeArenaInviteAction(formData: FormData) {
  const auth = await requireArenaAccess();
  if (auth.arenaRole !== "OWNER" && auth.arenaRole !== "ADMIN" && !["ADMIN", "SUPER_ADMIN"].includes(auth.systemRole)) throw new Error("Sem permissão.");
  const inviteId = String(formData.get("inviteId") ?? "");
  await prisma.accountActionToken.updateMany({ where: { id: inviteId, arenaId: auth.arenaId, kind: "INVITE", usedAt: null }, data: { usedAt: new Date() } });
  revalidatePath("/usuarios");
}

export async function requestPasswordResetAction(_: AccountAccessState, formData: FormData): Promise<AccountAccessState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "E-mail inválido.", success: null };
  if (!accountEmailIsConfigured()) return { error: "A recuperação por e-mail ainda não está disponível. Entre em contato com a agência.", success: null };
  const email = parsed.data.toLowerCase();
  const [user, recent] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.accountActionToken.count({ where: { email, kind: "RESET", createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } })
  ]);
  if (user && recent < 3) {
    try {
      await deliverPasswordReset(email, user.id);
    } catch {
      // Resposta indistinguível para não revelar se o endereço está cadastrado.
    }
  }
  return { error: null, success: genericResetMessage };
}

async function deliverPasswordReset(email: string, userId: string) {
  const { token, record } = await createAccountToken({ kind: "RESET", email, userId, hoursValid: .5 });
  try {
    await sendAccountEmail(email, "Recuperar senha · Arena Padel Manager", `Para criar uma nova senha, abra ${accountUrl("/redefinir-senha", token)} em até 30 minutos. Se você não solicitou a recuperação, ignore esta mensagem.`);
  } catch (error) {
    await prisma.accountActionToken.delete({ where: { id: record.id } });
    throw error;
  }
}

export async function sendArenaUserRecoveryAction(formData: FormData) {
  const auth = await requireArenaAccess();
  if (auth.arenaRole !== "OWNER" && auth.arenaRole !== "ADMIN" && !["ADMIN", "SUPER_ADMIN"].includes(auth.systemRole)) throw new Error("Sem permissão.");
  if (!accountEmailIsConfigured()) throw new Error("O envio de e-mails ainda não foi configurado pela agência.");
  const userId = String(formData.get("userId") ?? "");
  const member = await prisma.arenaMember.findUnique({ where: { userId_arenaId: { userId, arenaId: auth.arenaId } }, select: { user: { select: { id: true, email: true } } } });
  if (!member) throw new Error("Usuário não pertence à arena atual.");
  const recent = await prisma.accountActionToken.count({ where: { email: member.user.email, kind: "RESET", createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
  if (recent >= 3) throw new Error("Aguarde antes de enviar outro link para este usuário.");
  await deliverPasswordReset(member.user.email, member.user.id);
}

export async function completePasswordResetAction(_: AccountAccessState, formData: FormData): Promise<AccountAccessState> {
  const parsed = z.object({ token: tokenSchema, password: passwordSchema, confirmPassword: z.string() }).safeParse({ token: formData.get("token"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success || parsed.data.password !== parsed.data.confirmPassword) return { error: "Confira o link e a confirmação da nova senha.", success: null };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const tokenHash = hashAccountToken(parsed.data.token);
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.accountActionToken.findUnique({ where: { tokenHash } });
    if (!record || record.kind !== "RESET" || !record.userId || record.usedAt || record.expiresAt <= new Date()) return false;
    const claim = await tx.accountActionToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claim.count) return false;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.loginAttempt.deleteMany({ where: { email: record.email } });
    return true;
  });
  return result ? { error: null, success: "Senha redefinida. Entre novamente com a nova senha." } : { error: "Este link expirou ou já foi utilizado. Solicite outro.", success: null };
}

export async function acceptArenaInviteAction(_: AccountAccessState, formData: FormData): Promise<AccountAccessState> {
  const parsed = z.object({ token: tokenSchema, password: z.string().optional().default(""), confirmPassword: z.string().optional().default("") }).safeParse({ token: formData.get("token"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: "Convite inválido.", success: null };
  const tokenHash = hashAccountToken(parsed.data.token);
  const record = await prisma.accountActionToken.findUnique({ where: { tokenHash } });
  if (!record || record.kind !== "INVITE" || !record.arenaId || record.usedAt || record.expiresAt <= new Date()) return { error: "Convite expirado ou já usado. Solicite outro à arena.", success: null };
  const existingUser = await prisma.user.findUnique({ where: { email: record.email }, select: { id: true } });
  if (!existingUser && (!passwordSchema.safeParse(parsed.data.password).success || parsed.data.password !== parsed.data.confirmPassword)) return { error: "Crie uma senha de pelo menos 10 caracteres e confirme-a.", success: null };
  const passwordHash = existingUser ? null : await bcrypt.hash(parsed.data.password, 12);
  const accepted = await prisma.$transaction(async (tx) => {
    const fresh = await tx.accountActionToken.findUnique({ where: { tokenHash } });
    if (!fresh || fresh.kind !== "INVITE" || fresh.usedAt || fresh.expiresAt <= new Date() || !fresh.arenaId || !fresh.profileId) return false;
    const profile = await tx.permissionProfile.findFirst({ where: { id: fresh.profileId, arenaId: fresh.arenaId, active: true } });
    if (!profile) return false;
    const claim = await tx.accountActionToken.updateMany({ where: { id: fresh.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claim.count) return false;
    const currentUser = await tx.user.findUnique({ where: { email: fresh.email }, select: { id: true } });
    if (!currentUser && !passwordHash) return false;
    const user = currentUser ?? await tx.user.create({ data: { name: fresh.name, email: fresh.email, passwordHash: passwordHash!, systemRole: "VIEWER" }, select: { id: true } });
    await tx.arenaMember.upsert({ where: { userId_arenaId: { userId: user.id, arenaId: fresh.arenaId } }, create: { userId: user.id, arenaId: fresh.arenaId, role: fresh.arenaRole, permissionProfileId: profile.id, viewPermissions: profile.viewPermissions, editPermissions: profile.editPermissions }, update: {} });
    return true;
  });
  return accepted ? { error: null, success: existingUser ? "Acesso vinculado. Entre com sua senha atual." : "Acesso criado. Entre com a senha definida." } : { error: "Convite expirado ou já usado. Solicite outro à arena.", success: null };
}
