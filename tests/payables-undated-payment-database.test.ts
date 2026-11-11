import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import ts from "typescript";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);

test("paid payable without due date appears in its payment month without bypassing status, arena or bank filters", { skip: !local }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtime = new PrismaClient({ datasources: { db: { url: url.replace("postgres@", "arena_runtime@") } } });
  const ids = Array.from({ length: 5 }, () => `payable-date-${randomUUID()}`);
  try {
    const [own, foreign] = await Promise.all([
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    const base = { arenaId: own.id, type: "EXPENSE", category: "QA undated payable", description: "QA paid software", amountCents: 59530, status: "PAID", source: "AGENT_API", paidAt: new Date("2026-11-10T12:00:00Z") } as const;
    await admin.financialEntry.createMany({ data: [
      { ...base, id: ids[0] },
      { ...base, id: ids[1], paidAt: new Date("2026-10-10T12:00:00Z") },
      { ...base, id: ids[2], arenaId: foreign.id },
      { ...base, id: ids[3], dueDate: new Date("2026-12-10T12:00:00Z") },
      { ...base, id: ids[4], status: "PENDING", paidAt: null },
    ] });
    const source = readFileSync(new URL("../src/lib/finance/accounts.ts", import.meta.url), "utf8");
    const exports: Record<string, (...args: unknown[]) => Promise<Array<{ id: string; dueDate: string | null; paidAt: string | null }>>> = {};
    const require = createRequire(import.meta.url);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === "@/lib/rls") return { withArenaTransaction: (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
          return operation(tx);
        }) };
        if (name === "@/lib/pagination") return require("../src/lib/pagination.ts");
        if (name.startsWith("@/lib/finance/")) return require(`../src/lib/finance/${name.slice("@/lib/finance/".length)}.ts`);
        return require(name);
      },
    });
    const filters = { start: "2026-11-01", end: "2026-11-30", status: "ALL", category: base.category };
    const listed = await exports.getAccountsLedger(own.id, "EXPENSE", filters);
    assert.deepEqual(listed.filter(row => ids.includes(row.id)).map(row => row.id).sort(), [ids[0], ids[4]].sort());
    assert.equal(listed.find(row => row.id === ids[0])?.dueDate, null);
    assert.equal(listed.find(row => row.id === ids[0])?.paidAt, "2026-11-10");
    const paid = await exports.getAccountsLedger(own.id, "EXPENSE", { ...filters, status: "PAID" });
    assert.deepEqual(paid.map(row => row.id), [ids[0]]);
    const open = await exports.getAccountsLedger(own.id, "EXPENSE", { ...filters, status: "OPEN" });
    assert.deepEqual(open.map(row => row.id), [ids[4]]);
    const bank = await exports.getAccountsLedger(own.id, "EXPENSE", { ...filters, bankAccountId: "unrelated-bank" });
    assert.equal(bank.length, 0);
    const byPayment = await exports.getAccountsLedger(own.id, "EXPENSE", { ...filters, dateField: "paidAt" });
    assert.deepEqual(byPayment.map(row => row.id).sort(), [ids[0], ids[3]].sort());
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: { in: ids } } });
    await Promise.all([admin.$disconnect(), runtime.$disconnect()]);
  }
});
