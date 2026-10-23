"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { agentScopes } from "@/lib/agents/scopes";

export async function createAgentApiKeyAction(form: FormData) {
  const auth = await requireRole("ADMIN");
  const name = String(form.get("name") ?? "").trim();
  const scopes = [...new Set(form.getAll("scopes").map(String))];
  const days = Number(form.get("days") ?? "90");
  if (!name || name.length > 80) return { error: "Informe um nome de até 80 caracteres para o agente." };
  if (!scopes.length || scopes.some(scope => !Object.hasOwn(agentScopes, scope))) return { error: "Selecione ao menos um escopo válido." };
  if (![30, 90, 365].includes(days)) return { error: "Escolha uma validade de 30, 90 ou 365 dias." };
  const secret = `arena_${randomBytes(32).toString("hex")}`;
  await withArenaTransaction(auth.arenaId, async tx => {
    const key = await tx.agentApiKey.create({ data: { arenaId: auth.arenaId, name, scopes,
      prefix: secret.slice(0, 14), tokenHash: createHash("sha256").update(secret).digest("hex"), expiresAt: new Date(Date.now() + days * 86_400_000) } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "AGENT_KEY_CREATED", entityId: key.id, details: { name, scopes } } });
  });
  revalidatePath("/arena");
  return { secret };
}
export async function revokeAgentApiKeyAction(form: FormData) {
  const auth = await requireRole("ADMIN");
  const id = String(form.get("keyId") ?? "");
  await withArenaTransaction(auth.arenaId, async tx => {
    const key = await tx.agentApiKey.findFirst({ where: { id, arenaId: auth.arenaId, revokedAt: null }, select: { name: true } });
    if (!key) throw new Error("A chave não existe ou já foi revogada.");
    await tx.agentApiKey.update({ where: { id, arenaId: auth.arenaId }, data: { revokedAt: new Date() } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "AGENT_KEY_REVOKED", entityId: id, details: { name: key.name } } });
  });
  revalidatePath("/arena");
}
