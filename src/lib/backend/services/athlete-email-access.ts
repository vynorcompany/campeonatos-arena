
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/auth/database";
import { env } from "@/lib/env";
import { getPublicAthleteIdentity } from "@/lib/backend/services/player-session";
import { accountEmailIsConfigured, sendAccountEmail } from "@/lib/auth/account-email";
import { activeLoginLock, clearLoginFailures, recordFailedLogin } from "@/lib/auth/login-attempts";
import { athleteEmailKinds, issueAthleteEmailToken, confirmAthleteRecoveryEmail, resetAthletePasswordByEmail } from "@/lib/auth/athlete-email-recovery";

export type AthleteEmailAccessState = { error: string | null; success?: string };
const emailSchema = z.string().trim().max(254).email().transform(value => value.toLowerCase());
const tokenPattern = /^[a-f0-9]{64}$/i;
const genericResetNotice = "Se o e-mail estiver confirmado na sua conta, você receberá um link de recuperação.";
const unavailable = "O envio de e-mails ainda não está disponível. Tente novamente mais tarde.";
const blocked = (form: FormData) => Boolean(String(form.get("contactWebsite") ?? "").trim());

async function deliverIdentityEmail(identityId: string, email: string, kind: typeof athleteEmailKinds[keyof typeof athleteEmailKinds]) {
  const issued = await issueAthleteEmailToken(prisma, identityId, email, kind);
  if (!issued) return false;
  const verify = kind === athleteEmailKinds.verify;
  const url = new URL(verify ? "/portal/confirmar-email" : "/portal/redefinir-senha", env.appUrl!);
  url.searchParams.set("token", issued.token);
  try {
    await sendAccountEmail(email, verify ? "Confirme seu e-mail · VX4" : "Recuperar senha · VX4", `${verify ? "Para confirmar este e-mail como endereço de recuperação da sua conta, entre no Portal e abra" : "Para criar uma nova senha, abra"} ${url.toString()} em até 30 minutos. Este link é de uso único. Se você não solicitou, ignore esta mensagem.`);
    return true;
  } catch {
    await prisma.accountActionToken.updateMany({ where: { id: issued.id, usedAt: null }, data: { usedAt: new Date() } });
    return false;
  }
}

export async function requestAthleteEmailVerificationAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  if (blocked(form)) return { error: "Não foi possível validar o formulário." };
  const actor = await getPublicAthleteIdentity();
  if (!actor?.id) return { error: "Entre novamente no Portal para confirmar seu e-mail." };
  if (!accountEmailIsConfigured()) return { error: unavailable };
  const parsed = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("currentPassword") ?? "");
  if (!parsed.success || password.length < 8 || password.length > 128) return { error: "Confira o e-mail e a senha atual." };
  const key = `athlete-email:${actor.id}`;
  if (await activeLoginLock(key)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const identity = await prisma.athleteIdentity.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
  if (!identity || !await bcrypt.compare(password, identity.passwordHash)) { await recordFailedLogin(key); return { error: "Senha atual inválida." }; }
  await clearLoginFailures(key);
  const sent = await deliverIdentityEmail(actor.id, parsed.data, athleteEmailKinds.verify);
  return sent ? { error: null, success: "Enviamos o link de confirmação. Ele vale por 30 minutos." } : { error: "Não foi possível enviar. Aguarde alguns minutos e tente novamente." };
}

export async function confirmAthleteEmailAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  if (blocked(form)) return { error: "Não foi possível validar o formulário." };
  const actor = await getPublicAthleteIdentity();
  if (!actor?.id) return { error: "Entre na sua conta e abra novamente o link de confirmação." };
  const token = String(form.get("token") ?? "");
  if (!tokenPattern.test(token)) return { error: "Link inválido ou expirado." };
  try {
    if (!await confirmAthleteRecoveryEmail(prisma, token, actor.id)) return { error: "O link expirou, já foi utilizado ou pertence a outra conta." };
    return { error: null, success: "E-mail confirmado para recuperação da sua conta." };
  } catch { return { error: "Não foi possível confirmar este endereço. Solicite um novo link." }; }
}

export async function requestAthleteEmailPasswordResetAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  if (blocked(form)) return { error: "Não foi possível validar o formulário." };
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  if (!accountEmailIsConfigured()) return { error: unavailable };
  const identity = await prisma.athleteIdentity.findUnique({ where: { recoveryEmail: parsed.data }, select: { id: true, recoveryEmailVerifiedAt: true } });
  if (identity?.recoveryEmailVerifiedAt) {
    try { await deliverIdentityEmail(identity.id, parsed.data, athleteEmailKinds.reset); } catch { /* Same response for unknown addresses and delivery failures. */ }
  }
  return { error: null, success: genericResetNotice };
}

export async function completeAthleteEmailPasswordResetAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  if (blocked(form)) return { error: "Não foi possível validar o formulário." };
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!tokenPattern.test(token) || password.length < 10 || password.length > 128 || password !== form.get("confirmPassword")) return { error: "Confira o link e a confirmação da senha (mínimo de 10 caracteres)." };
  const passwordHash = await bcrypt.hash(password, 12);
  const changed = await resetAthletePasswordByEmail(prisma, token, passwordHash);
  return changed ? { error: null, success: "Senha atualizada. Entre novamente no Portal." } : { error: "Este link expirou ou já foi utilizado. Solicite outro." };
}
