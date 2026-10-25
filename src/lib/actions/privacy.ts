"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { activeLoginLock, clearLoginFailures, recordFailedLogin } from "@/lib/auth/login-attempts";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { createPrivacyRequest, eraseOptionalProfile, exportPrivateProfile } from "@/lib/legal/privacy-service";
import { eraseArenaMembership } from "@/lib/legal/membership-erasure";

export type PrivacyActionState = { error: string | null; notice?: string; download?: string; closed?: boolean };
const schema = z.object({ arenaSlug: z.string().min(1).max(150), password: z.string().min(1).max(200), operation: z.enum(["EXPORT", "CLEAR_PROFILE", "REQUEST", "CLOSE_MEMBERSHIP"]), kind: z.enum(["ERASURE", "CORRECTION", "ACCESS", "OTHER"]).default("ERASURE"), message: z.string().trim().max(3000).default("") });

export async function privacyAction(_: PrivacyActionState, form: FormData): Promise<PrivacyActionState> {
  if (String(form.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário." };
  const parsed = schema.safeParse({ arenaSlug: form.get("arenaSlug"), password: form.get("password"), operation: form.get("operation"), kind: form.get("kind") ?? "ERASURE", message: form.get("message") ?? "" });
  if (!parsed.success) return { error: "Revise os campos e confirme sua senha atual." };
  const auth = await getPublicPlayerAuth(parsed.data.arenaSlug);
  if (!auth) return { error: "Entre na conta desta arena para gerenciar seus dados." };
  const key = `privacy:${auth.playerAccountId}`;
  if (await activeLoginLock(key)) return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  const account = await prisma.playerAccount.findFirst({ where: { id: auth.playerAccountId, arenaId: auth.arenaId, playerId: auth.playerId }, select: { passwordHash: true, identity: { select: { passwordHash: true } } } });
  if (!account || !(await bcrypt.compare(parsed.data.password, account.passwordHash) || (account.identity && await bcrypt.compare(parsed.data.password, account.identity.passwordHash)))) {
    await recordFailedLogin(key);
    return { error: "Senha atual incorreta." };
  }
  await clearLoginFailures(key);
  if (parsed.data.operation === "CLEAR_PROFILE" && form.get("confirmRemoval") !== "on") return { error: "Confirme a remoção dos dados opcionais." };
  if (parsed.data.operation === "CLOSE_MEMBERSHIP" && (form.get("confirmRemoval") !== "on" || form.get("confirmation") !== "EXCLUIR")) return { error: "Confirme o encerramento e digite EXCLUIR para continuar." };
  let result: PrivacyActionState;
  try { result = await withArenaTransaction(auth.arenaId, async tx => {
    if (auth.athleteIdentityId) await tx.$queryRaw`SELECT id FROM "AthleteIdentity" WHERE id = ${auth.athleteIdentityId} FOR UPDATE`;
    // Prevent a concurrent password reset or account unlink from invalidating the proof.
    const locked = await tx.$queryRaw<Array<{ passwordHash: string; identityId: string | null }>>`SELECT "passwordHash", "identityId" FROM "PlayerAccount" WHERE id = ${auth.playerAccountId} AND "arenaId" = ${auth.arenaId} AND "playerId" = ${auth.playerId} FOR UPDATE`;
    if (locked.length !== 1 || locked[0].passwordHash !== account.passwordHash) throw new Error("Sua conta foi alterada. Entre novamente para continuar.");
    if (locked[0].identityId) {
      const identity = await tx.athleteIdentity.findUnique({ where: { id: locked[0].identityId }, select: { passwordHash: true } });
      if (identity?.passwordHash !== account.identity?.passwordHash) throw new Error("Sua senha foi alterada. Entre novamente para continuar.");
    }
    const owner = { arenaId: auth.arenaId, playerId: auth.playerId };
    if (parsed.data.operation === "CLOSE_MEMBERSHIP") {
      const receipt = await eraseArenaMembership(tx, { ...owner, accountId: auth.playerAccountId });
      return { error: null, closed: true, notice: `Vínculo encerrado. Protocolo: ${receipt.protocol}. ${receipt.retentionNotice}`, download: JSON.stringify(receipt, null, 2) };
    }
    if (parsed.data.operation === "EXPORT") return { error: null, notice: "Cópia do perfil preparada.", download: JSON.stringify(await exportPrivateProfile(tx, owner), null, 2) };
    if (parsed.data.operation === "CLEAR_PROFILE") {
      await eraseOptionalProfile(tx, owner);
      return { error: null, notice: "Foto, bio, nascimento e informações esportivas opcionais foram removidos nesta arena. Seu acesso e os registros operacionais foram preservados." };
    }
    const request = await createPrivacyRequest(tx, owner, parsed.data.kind, parsed.data.message);
    return { error: null, notice: `${request.reused ? "Você já tem uma solicitação deste tipo em análise" : "Solicitação enviada à arena"}. Protocolo: ${request.id}. Acompanhe a resposta nesta página.` };
  }, { timeout: parsed.data.operation === "CLOSE_MEMBERSHIP" ? 30000 : 5000 });
  } catch {
    return { error: "Não foi possível confirmar a conclusão. Atualize a página e procure a arena antes de repetir a operação." };
  }
  if (result.closed) return result;
  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`, "layout");
  revalidatePath("/configuracoes/privacidade");
  return result;
}
