import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Prisma, PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/actions/public-finance-payment.ts", import.meta.url), "utf8");

function paymentFlow(initialPending: { playerId: string; checkoutUrl: string; amountCents: number; items: Array<{ financialEntryId: string; amountCents: number }>; createdAt?: Date; mercadoPagoPaymentId?: string } | null = null) {
  const checkouts: Array<{ id: string; playerId: string; status: string; amountCents: number; checkoutUrl: string; mercadoPagoPaymentId: string; createdAt: Date; items: Array<{ financialEntryId: string; amountCents: number }> }> = initialPending
    ? [{ id: "checkout-existing", status: "PENDING", createdAt: new Date(), mercadoPagoPaymentId: "", ...initialPending }] : [];
  const locks: string[] = [];
  let providerCalls = 0;
  const tx = {
    $queryRaw: async (_sql: TemplateStringsArray, id: string) => { locks.push(id); return [{ id }]; },
    financialEntry: { findMany: async () => [{ id: "entry-a", arenaId: "arena-a", playerId: "player-a", type: "REVENUE", status: "PENDING", amountCents: 5000, settlements: [], notes: "", description: "Aula" }] },
    player: { findFirst: async () => ({ email: "atleta@example.test" }) },
    onlinePaymentCheckout: {
      findFirst: async () => null,
      findMany: async ({ where }: { where: { createdAt?: { lt: Date }; checkoutUrl?: string; mercadoPagoPaymentId?: string } }) => checkouts.filter((checkout) => checkout.status === "PENDING"
        && (!where.createdAt || checkout.createdAt < where.createdAt.lt)
        && (where.checkoutUrl === undefined || checkout.checkoutUrl === where.checkoutUrl)
        && (where.mercadoPagoPaymentId === undefined || checkout.mercadoPagoPaymentId === where.mercadoPagoPaymentId)),
      create: async ({ data }: { data: { playerId: string; amountCents: number; items: { create: Array<{ financialEntryId: string; amountCents: number }> } } }) => {
        const checkout = { id: "checkout-new", playerId: data.playerId, status: "PENDING", amountCents: data.amountCents, checkoutUrl: "", mercadoPagoPaymentId: "", createdAt: new Date(), items: data.items.create };
        checkouts.push(checkout);
        return checkout;
      },
      updateMany: async ({ where, data }: { where: { id: string; status: string; createdAt?: { lt: Date }; checkoutUrl?: string; mercadoPagoPaymentId?: string }; data: { checkoutUrl?: string; mercadoPagoPaymentId?: string; status?: string } }) => {
        const checkout = checkouts.find((item) => item.id === where.id);
        if (checkout && checkout.status === where.status
          && (!where.createdAt || checkout.createdAt < where.createdAt.lt)
          && (where.checkoutUrl === undefined || checkout.checkoutUrl === where.checkoutUrl)
          && (where.mercadoPagoPaymentId === undefined || checkout.mercadoPagoPaymentId === where.mercadoPagoPaymentId)) { Object.assign(checkout, data); return { count: 1 }; }
        return { count: 0 };
      },
    },
  };
  const exports: Record<string, (data: FormData) => Promise<{ checkoutUrl: string }>> = {};
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath: () => {} },
    zod: require("zod"),
    "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: "arena-a", playerId: "player-a" }) },
    "@/lib/finance/ledger": { getFinancialEntryBalance: (amountCents: number) => ({ outstandingCents: amountCents }) },
    "@/lib/payments/mercado-pago": { createHostedCheckout: async () => { providerCalls += 1; return { checkoutUrl: "https://checkout.example.test/a", paymentId: "preference-a" }; } },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => unknown) => callback(tx) },
    "@/lib/env": { env: { appUrl: "https://arena.example.test" } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, FormData, URL, Date, Set,
    require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; },
  });
  const form = new FormData();
  form.set("arenaSlug", "arena-a"); form.append("entryId", "entry-a");
  return { action: () => exports.startPublicFinancialEntryPaymentAction(form), checkouts, locks, get providerCalls() { return providerCalls; } };
}

test("repetir pagamento do mesmo débito reutiliza o link sem criar outro checkout", async () => {
  const flow = paymentFlow();
  const first = await flow.action();
  const second = await flow.action();
  assert.equal(first.checkoutUrl, second.checkoutUrl);
  assert.equal(flow.providerCalls, 1);
  assert.equal(flow.checkouts.length, 1);
  assert.deepEqual(flow.locks, ["entry-a", "entry-a"]);
});

test("checkout ainda em criação impede outra cobrança para o mesmo débito", async () => {
  const flow = paymentFlow({ playerId: "player-a", checkoutUrl: "", amountCents: 5000, items: [{ financialEntryId: "entry-a", amountCents: 5000 }] });
  await assert.rejects(flow.action(), /pagamento em andamento/);
  assert.equal(flow.providerCalls, 0);
  assert.equal(flow.checkouts.length, 1);
});

test("link antigo com valor divergente não é reutilizado", async () => {
  const flow = paymentFlow({ playerId: "player-a", checkoutUrl: "https://checkout.example.test/old", amountCents: 7000, items: [{ financialEntryId: "entry-a", amountCents: 7000 }] });
  await assert.rejects(flow.action(), /pagamento em andamento/);
  assert.equal(flow.providerCalls, 0);
});

test("tentativa sem link abandonada há mais de dez minutos é liberada antes de criar outra", async () => {
  const flow = paymentFlow({ playerId: "player-a", checkoutUrl: "", amountCents: 5000, items: [{ financialEntryId: "entry-a", amountCents: 5000 }], createdAt: new Date(Date.now() - 11 * 60_000) });
  const result = await flow.action();
  assert.equal(result.checkoutUrl, "https://checkout.example.test/a");
  assert.equal(flow.checkouts[0].status, "FAILED");
  assert.equal(flow.checkouts[1].status, "PENDING");
  assert.deepEqual(flow.locks, ["checkout-existing", "entry-a"]);
});

test("checkout com link publicado não é liberado automaticamente mesmo se antigo", async () => {
  const flow = paymentFlow({ playerId: "player-a", checkoutUrl: "https://checkout.example.test/old", amountCents: 5000, items: [{ financialEntryId: "entry-a", amountCents: 5000 }], createdAt: new Date(Date.now() - 60 * 60_000) });
  const result = await flow.action();
  assert.equal(result.checkoutUrl, "https://checkout.example.test/old");
  assert.equal(flow.checkouts[0].status, "PENDING");
  assert.equal(flow.providerCalls, 0);
});

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("atleta da arena A não inicia checkout de lançamento da arena B", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const entryId = `goal-cross-arena-entry-${randomUUID()}`;
  let providerCalls = 0;
  try {
    const [arenaA, arenaB] = await Promise.all([
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    await admin.financialEntry.create({ data: { id: entryId, arenaId: arenaB.id, type: "REVENUE", category: "Teste descartável", description: "Outro tenant", amountCents: 5000 } });
    const exports: Record<string, (data: FormData) => Promise<{ checkoutUrl: string }>> = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath: () => {} }, zod: require("zod"),
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arenaA.id, playerId: "goal-athlete-a" }) },
      "@/lib/finance/ledger": { getFinancialEntryBalance: (amountCents: number) => ({ outstandingCents: amountCents }) },
      "@/lib/payments/mercado-pago": { createHostedCheckout: async () => { providerCalls += 1; throw new Error("O provedor não pode ser chamado para outro tenant."); } },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async (tx) => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); }) },
      "@/lib/env": { env: { appUrl: "https://arena.example.test" } },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, FormData, URL, Date, Set,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; },
    });
    const form = new FormData(); form.set("arenaSlug", "arena-teste-goal"); form.append("entryId", entryId);
    await assert.rejects(exports.startPublicFinancialEntryPaymentAction(form), /lançamentos não estão disponíveis/);
    assert.equal(providerCalls, 0);
    assert.equal(await admin.onlinePaymentCheckout.count({ where: { arenaId: arenaA.id, items: { some: { financialEntryId: entryId } } } }), 0);
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: entryId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("duas ações concorrentes criam somente um checkout no PostgreSQL", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const entryId = `goal-concurrent-checkout-${randomUUID()}`;
  const playerId = `goal-concurrent-player-${randomUUID()}`;
  let releaseProvider: (() => void) | undefined;
  let providerStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { providerStarted = resolve; });
  const released = new Promise<void>((resolve) => { releaseProvider = resolve; });
  let providerCalls = 0;
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const player = await admin.player.create({ data: { id: playerId, arenaId: arena.id, name: "Atleta descartável checkout", email: "checkout-goal@example.test" }, select: { id: true } });
    await admin.financialEntry.create({ data: { id: entryId, arenaId: arena.id, playerId: player.id, type: "REVENUE", category: "Teste descartável", description: "Checkout concorrente descartável", amountCents: 5000 } });
    const exports: Record<string, (data: FormData) => Promise<{ checkoutUrl: string }>> = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath: () => {} }, zod: require("zod"),
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arena.id, playerId: player.id }) },
      "@/lib/finance/ledger": { getFinancialEntryBalance: (amountCents: number) => ({ outstandingCents: amountCents }) },
      "@/lib/payments/mercado-pago": { createHostedCheckout: async () => { providerCalls += 1; providerStarted?.(); await released; return { checkoutUrl: "https://checkout.example.test/concurrent", paymentId: "preference-concurrent" }; } },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async (tx) => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); }) },
      "@/lib/env": { env: { appUrl: "https://arena.example.test" } },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, FormData, URL, Date, Set,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; },
    });
    const form = new FormData(); form.set("arenaSlug", "arena-teste-goal"); form.append("entryId", entryId);
    const first = exports.startPublicFinancialEntryPaymentAction(form).then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));
    let waitTimer: ReturnType<typeof setTimeout> | undefined;
    const firstEvent = await Promise.race([started.then(() => "provider"), first.then(() => "finished"), new Promise<string>((resolve) => { waitTimer = setTimeout(() => resolve("timeout"), 10_000); })]);
    if (waitTimer) clearTimeout(waitTimer);
    if (firstEvent === "finished") { const result = await first; if (!result.ok) throw result.error; }
    assert.equal(firstEvent, "provider", "a primeira ação precisa concluir a reserva no banco antes de consultar o provedor");
    await assert.rejects(exports.startPublicFinancialEntryPaymentAction(form), /pagamento em andamento/);
    releaseProvider?.();
    const result = await first;
    if (!result.ok) throw result.error;
    assert.equal(result.value.checkoutUrl, "https://checkout.example.test/concurrent");
    assert.equal((await exports.startPublicFinancialEntryPaymentAction(form)).checkoutUrl, result.value.checkoutUrl);
    assert.equal(providerCalls, 1);
    assert.equal(await admin.onlinePaymentCheckout.count({ where: { arenaId: arena.id, items: { some: { financialEntryId: entryId } } } }), 1);
  } finally {
    releaseProvider?.();
    const checkouts = await admin.onlinePaymentCheckout.findMany({ where: { items: { some: { financialEntryId: entryId } } }, select: { id: true } });
    if (checkouts.length) await admin.onlinePaymentCheckout.deleteMany({ where: { id: { in: checkouts.map((checkout) => checkout.id) } } });
    await admin.financialEntry.deleteMany({ where: { id: entryId } });
    await admin.player.deleteMany({ where: { id: playerId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
