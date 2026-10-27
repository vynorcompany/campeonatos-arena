import { readAgentDashboard } from "@/lib/agents/dashboard";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { z } from "zod";
import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { authenticateAgent, AgentAccessError } from "@/lib/agents/authenticate";
import { resourceScopes } from "@/lib/agents/scopes";
import { withArenaTransaction } from "@/lib/rls";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof AgentAccessError) return json({ error: error.message }, error.status);
  console.error("Falha na API de agentes", error instanceof Error ? error.name : "Erro desconhecido");
  return json({ error: "Serviço temporariamente indisponível. Tente novamente." }, 503);
}
const querySchema = z.object({ view: z.enum(["caixa","competencia"]).optional(), period: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/).optional(), offset: z.coerce.number().int().min(0).max(100000).default(0), from: z.string().datetime().optional(), to: z.string().datetime().optional() }).strict();
export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!Object.hasOwn(resourceScopes, resource)) return json({ error: "Recurso não encontrado." }, 404);
  try {
    const key = await authenticateAgent(request, resourceScopes[resource]);
    const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return json({ error: "Use offset inteiro e datas ISO em from e to." }, 400);
    if(query.data.period && (query.data.from || query.data.to || query.data.offset)) return json({error:"Use período mensal ou datas/offset, sem combinar."},400);
    if (resource === "dashboard") {
      if (!query.data.period) return json({ error: "Informe period AAAA-MM para consultar o Dashboard." }, 400);
      const result = await readAgentDashboard(key.arenaId, query.data.period, query.data.view ?? "caixa");
      await withArenaTransaction(key.arenaId, tx => tx.agentApiKey.update({ where: { id: key.id, arenaId: key.arenaId }, data: { lastUsedAt: new Date() } }));
      return json(result);
    }
    if (query.data.view) return json({ error: "view é exclusivo do Dashboard." }, 400);
    const monthStart=query.data.period ? new Date(query.data.period+"-01T00:00:00-03:00") : null;
    const monthEnd=monthStart ? new Date(monthStart) : null;
    if(monthEnd)monthEnd.setUTCMonth(monthEnd.getUTCMonth()+1);
    const from = monthStart ?? (query.data.from ? new Date(query.data.from) : new Date(Date.now() - 7 * 86_400_000));
    const to = monthEnd ?? (query.data.to ? new Date(query.data.to) : new Date(from.getTime() + 30 * 86_400_000));
    if (to <= from || to.getTime() - from.getTime() > 31 * 86_400_000) return json({ error: "Informe um período de até 31 dias com a data final após a inicial." }, 400);
    const data = await withArenaTransaction(key.arenaId, async tx => {
      await tx.agentApiKey.update({ where: { id: key.id, arenaId: key.arenaId }, data: { lastUsedAt: new Date() } });
      const pagination = { take: query.data.period ? 1001 : 100, skip: query.data.offset };
      const where = { arenaId: key.arenaId };
      // Creation is neither payment nor accounting competence. Export a union of
      // actual payments and maturities, and state the basis instead of inventing it.
      const financeWhere = { ...where, OR: [{ paidAt: { gte: from, lt: to } }, { dueDate: { gte: from, lt: to } }] };
      switch (resource) {
        case "agents": return tx.agentApiKey.findMany({ where, ...pagination, orderBy: { id: "asc" }, select: { id: true, name: true, scopes: true, expiresAt: true, revokedAt: true, lastUsedAt: true } });
        case "clients": return tx.player.findMany({ where, ...pagination, orderBy: { id: "asc" }, select: { id: true, name: true, active: true, phone: true, email: true } });
        case "teachers": return tx.teacher.findMany({ where, ...pagination, orderBy: { id: "asc" }, select: { id: true, name: true, active: true } });
        case "reservations": return (await tx.scheduleOccurrence.findMany({ where: { ...where, startsAt: { gte: instantToArenaWallClock(from), lt: instantToArenaWallClock(to) } }, ...pagination, orderBy: [{ startsAt: "asc" }, { id: "asc" }], select: { id: true, title: true, startsAt: true, endsAt: true, status: true, responsiblePlayerId: true, teacherId: true, occurrenceCourts: { select: { courtId: true } }, participants: { select: { playerId: true, checkedInAt: true } } } })).map(row => ({ ...row, startsAt: arenaWallClockToInstant(row.startsAt), endsAt: arenaWallClockToInstant(row.endsAt) }));
        case "finance": return tx.financialEntry.findMany({ where: financeWhere, ...pagination, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, description: true, type: true, category: true, amountCents: true, status: true, dueDate: true, paidAt: true, createdAt: true, updatedAt: true, playerId: true } });
        case "reports": return tx.financialEntry.groupBy({ by: ["type", "status"], where: { ...financeWhere, status: { not: "VOIDED" } }, _sum: { amountCents: true }, _count: true });
      }
    });
    return json({ data: Array.isArray(data) && query.data.period ? data.slice(0,1000) : data, period_month: query.data.period, currency: "BRL", ...(resource === "reports" ? { description: "Valor nominal dos lançamentos por tipo e situação; não representa saldo bancário ou recebimento efetivo." } : { nextOffset: Array.isArray(data) && data.length === 100 ? query.data.offset + 100 : null }), period: { from, to }, ...(resource === "finance" || resource === "reports" ? {
      source: { system: "arena", company: key.arenaId },
      coverage: { basis: "payment_or_due_date", competenceAvailable: false, openingBalanceAvailable: false, bankStatementAvailable: false, completeDataset: Boolean(query.data.period && Array.isArray(data) && data.length<=1000),
        limitation: "Recorte por pagamento ou vencimento; não representa DRE por competência nem saldo bancário. Lançamentos sem ambas as datas não integram o recorte." },
    } : {}) });
  } catch (error) { return failure(error); }
}
const entrySchema = z.object({
  description: z.string().trim().min(1).max(200), category: z.string().trim().min(1).max(80),
  type: z.enum(["REVENUE", "EXPENSE"]), amountCents: z.number().int().positive().max(2_147_483_647),
  dueDate: z.string().datetime().optional(), playerId: z.string().min(1).optional(), bankAccountId: z.string().min(1).optional(),
}).strict();
export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if ((await params).resource !== "finance") return json({ error: "Escrita disponível somente em /api/agents/finance." }, 405);
  try {
    const key = await authenticateAgent(request, "finance:write");
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(idempotencyKey)) return json({ error: "Informe Idempotency-Key com 8 a 80 letras, números, hífen ou sublinhado para evitar lançamentos duplicados." }, 400);
    let body: unknown; try { body = await readBoundedJson(request, 64 * 1024); } catch (error) { return json({ error: error instanceof RequestBodyTooLargeError ? error.message : "Envie um JSON válido." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) return json({ error: "Informe descrição, categoria, tipo REVENUE ou EXPENSE e amountCents inteiro positivo. Datas devem estar em ISO; novos lançamentos ficam pendentes." }, 400);
    const data = await withArenaTransaction(key.arenaId, async tx => {
      await tx.$queryRaw`SELECT id FROM "AgentApiKey" WHERE id = ${key.id} AND "arenaId" = ${key.arenaId} FOR UPDATE`;
      const active = await tx.agentApiKey.findFirst({ where: { id: key.id, arenaId: key.arenaId, revokedAt: null, expiresAt: { gt: new Date() } } });
      if (!active?.scopes.includes("finance:write")) throw new AgentAccessError("A chave foi revogada ou perdeu a permissão de escrita.", 403);
      const reference = `${key.id}:${idempotencyKey}`;
      const previous = await tx.financialEntry.findFirst({ where: { arenaId: key.arenaId, source: "AGENT_API", externalReference: reference } });
      if (previous) {
        const matches = previous.description === parsed.data.description && previous.type === parsed.data.type && previous.category === parsed.data.category && previous.amountCents === parsed.data.amountCents && previous.playerId === (parsed.data.playerId ?? null) && previous.bankAccountId === (parsed.data.bankAccountId ?? null) && previous.dueDate?.toISOString() === (parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : undefined);
        if (!matches) throw new AgentAccessError("Idempotency-Key já utilizada com outros dados. Use outra chave para um novo lançamento.", 409);
        return { id: previous.id, status: previous.status, reused: true };
      }
      if (parsed.data.playerId && !await tx.player.findFirst({ where: { id: parsed.data.playerId, arenaId: key.arenaId } })) throw new AgentAccessError("Cliente não encontrado nesta arena.", 400);
      if (parsed.data.bankAccountId && !await tx.bankAccount.findFirst({ where: { id: parsed.data.bankAccountId, arenaId: key.arenaId } })) throw new AgentAccessError("Conta bancária não encontrada nesta arena.", 400);
      const entry = await tx.financialEntry.create({ data: { ...parsed.data, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null, arenaId: key.arenaId, status: "PENDING", source: "AGENT_API", externalReference: reference } });
      await tx.auditEvent.create({ data: { arenaId: key.arenaId, actorId: key.id, actorName: active.name, action: "FINANCIAL_ENTRY_CREATED", entityId: entry.id, details: { description: entry.description, amountCents: entry.amountCents, source: "AGENT_API" } } });
      await tx.agentApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      return { id: entry.id, status: entry.status, reused: false };
    });
    return json({ data }, data.reused ? 200 : 201);
  } catch (error) { return failure(error); }
}
