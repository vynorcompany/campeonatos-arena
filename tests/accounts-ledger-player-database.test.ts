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
      { id: ownId, arenaId: arenaA.id, playerId: ownPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível descartável", amountCents: 100, status: "PENDING" },
      { id: foreignId, arenaId: arenaB.id, playerId: foreignPlayer.id, type: "REVENUE", category: "GOAL", description: "Recebível de outra arena", amountCents: 100, status: "PENDING" },
    ] });

    const source = readFileSync(new URL("../src/lib/finance/accounts.ts", import.meta.url), "utf8");
    const exports: Record<string, (arenaId: string, type: string) => Promise<Array<{ id: string; counterpartyName: string }>>> = {};
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
    assert.equal(entries.find((entry) => entry.id === ownId)?.counterpartyName, ownPlayer.name);
    assert.equal(entries.some((entry) => entry.id === foreignId), false);
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: { in: [ownId, foreignId] } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
