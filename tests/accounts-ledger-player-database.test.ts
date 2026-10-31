import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import ts from "typescript";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("contas a receber mostra o cliente diretamente vinculado sem trazer a outra arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: testUrl.replace("postgres@", "arena_runtime@") } } });
  const ownId = `goal-ledger-own-${randomUUID()}`;
  const foreignId = `goal-ledger-foreign-${randomUUID()}`;
  const datedId = `goal-ledger-dated-${randomUUID()}`;
  const futureId = `goal-ledger-future-${randomUUID()}`;
  const paidId = `goal-ledger-paid-${randomUUID()}`;
  try {
    const [arenaA, arenaB] = await Promise.all([
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    const [ownPlayer, foreignPlayer] = await Promise.all([
      admin.player.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Atleta GOAL A" }, select: { id: true, name: true } }),
      admin.player.findFirstOrThrow({ where: { arenaId: arenaB.id, name: "Atleta Exclusivo Outra Arena GOAL" }, select: { id: true } }),
    ]);
    await admin.financialEntry.createMany({ data: [
      { id: ownId, arenaId: arenaA.id, playerId: ownPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível descartável", amountCents: 100, status: "PENDING", source: "GRIPO_IMPORT", counterpartyName: "Nome anterior no Gripo" },
      { id: datedId, arenaId: arenaA.id, playerId: ownPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível datado", amountCents: 200, status: "PENDING", dueDate: new Date("2026-10-20T12:00:00Z") },
      { id: futureId, arenaId: arenaA.id, playerId: ownPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível futuro", amountCents: 300, status: "PENDING", dueDate: new Date("2027-01-20T12:00:00Z") },
      { id: paidId, arenaId: arenaA.id, playerId: ownPlayer.id, type: "INCOME", category: "COMANDAS", description: "Recebível quitado sem vencimento", amountCents: 400, status: "PAID", paidAt: new Date("2026-09-20T12:00:00Z") },
      { id: foreignId, arenaId: arenaB.id, playerId: foreignPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível de outra arena", amountCents: 100, status: "PENDING" },
    ] });

    const source = readFileSync(new URL("../src/lib/finance/accounts.ts", import.meta.url), "utf8");
    const exports: Record<string, (arenaId: string, type: string, filters?: Record<string, unknown>) => Promise<Array<{ id: string; counterpartyName: string }>>> = {};
    const require = createRequire(import.meta.url);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === "@/lib/rls") return { withArenaTransaction: (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
          return operation(tx);
        }) };
        if (name.startsWith("@/lib/finance/")) return require(`../src/lib/finance/${name.slice("@/lib/finance/".length)}.ts`);
        return require(name);
      },
    });
    const entries = await exports.getAccountsLedger(arenaA.id, "REVENUE");
    assert.equal(entries.find((entry) => entry.id === datedId)?.counterpartyName, ownPlayer.name);
    assert.ok(entries.findIndex(entry => entry.id === ownId) < entries.findIndex(entry => entry.id === datedId));
    const filtered = await exports.getAccountsLedger(arenaA.id, "REVENUE", { start: "2026-10-01", end: "2026-10-31", name: ownPlayer.name });
    assert.ok(filtered.some(entry => entry.id === ownId), "Imported undated debt is visible by linked client's current name");
    assert.ok(filtered.some(entry => entry.id === datedId));
    assert.ok(!filtered.some(entry => [futureId, paidId, foreignId].includes(entry.id)), "Date and arena filters still apply to dated or paid entries");
    const legacyPaid = await exports.getAccountsLedger(arenaA.id, "REVENUE", {start:"2026-09-01",end:"2026-09-30",category:"Comandas",status:"PAID"});
    assert.equal(legacyPaid.filter(entry => entry.id === paidId).length, 1, "legacy undated receipt appears once in its payment month under the default date filter");
    const paidPeriod = await exports.getAccountsLedger(arenaA.id, "REVENUE", { start: "2026-10-01", end: "2026-10-31", dateField: "paidAt" });
    assert.ok(!paidPeriod.some(entry => [ownId, paidId].includes(entry.id)), "Payment-date filter excludes unpaid entries and payments outside period");
    const category = await exports.getAccountsLedger(arenaA.id, "REVENUE", { start: "2026-10-01", end: "2026-10-31", category: "Categoria sem registros" });
    assert.ok(!category.some(entry => entry.id === ownId), "Other filters are not bypassed by null dates");
    assert.equal(entries.some((entry) => entry.id === foreignId), false);
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: { in: [ownId, foreignId, datedId, futureId, paidId] } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
