import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AgentScope } from "./scopes";
export type AgentCredentials = { id: string; arenaId: string; scopes: string[] };
export class AgentAccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function authenticateAgent(request: Request, scope: AgentScope): Promise<AgentCredentials> {
  const match = /^Bearer (arena_[a-f0-9]{64})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new AgentAccessError("Informe uma chave API válida no cabeçalho Authorization: Bearer.", 401);
  const hash = createHash("sha256").update(match[1]).digest("hex");
  const [key] = await prisma.$queryRaw<AgentCredentials[]>`SELECT * FROM public.authenticate_agent_key(${hash})`;
  if (!key) throw new AgentAccessError("Chave API inválida, expirada ou revogada.", 401);
  if (!key.scopes.includes(scope)) throw new AgentAccessError("Esta chave não tem permissão para a operação solicitada.", 403);
  return key;
}
