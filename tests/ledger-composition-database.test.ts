import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgres(?:ql)?:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);

test("ledger totals and value sorting include adjustments across pages and isolate arenas for payables and receivables", { skip: !local }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [], marker = `qa-composition-${randomUUID()}`;
  const require = createRequire(import.meta.url), actions: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/finance/accounts.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, URLSearchParams, Date, require: (name: string) => {
    if (name === "@/lib/rls") return { withArenaTransaction: (arenaId: string, fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return fn(tx); }) };
    if (name === "@/lib/pagination") return require("../src/lib/pagination.ts");
    if (name.startsWith("@/lib/finance/")) return require(`../src/lib/finance/${name.slice("@/lib/finance/".length)}.ts`);
    return require(name);
  } });
  try {
    const own = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const foreign = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    for (const type of ["REVENUE", "EXPENSE"]) {
      const description = `${marker}-${type}`;
      const a = await admin.financialEntry.create({ data: { arenaId: own.id, type, category: "QA", description, source: "MANUAL", amountCents: 10500, originalAmountCents: 10000, creationInterestCents: 1000, creationDiscountCents: 500, status: "PARTIAL" } }); ids.push(a.id);
      await admin.financialSettlement.create({ data: { arenaId: own.id, financialEntryId: a.id, amountCents: 4000, interestCents: 3000, discountCents: 100, paymentMethod: "PIX" } });
      const b = await admin.financialEntry.create({ data: { arenaId: own.id, type, category: "QA", description, amountCents: 12000, originalAmountCents: 12000, creationInterestCents: 0, creationDiscountCents: 0 } }); ids.push(b.id);
      const other = await admin.financialEntry.create({ data: { arenaId: foreign.id, type, category: "QA", description, amountCents: 999999 } }); ids.push(other.id);
      await admin.financialSettlement.create({ data: { arenaId: foreign.id, financialEntryId: other.id, amountCents: 1, interestCents: 100000, paymentMethod: "PIX" } });
      const voided = await admin.financialEntry.create({ data: { arenaId: own.id, type, category: "QA", description, amountCents: 999999, status: "VOIDED" } }); ids.push(voided.id);
      const tiny = Array.from({ length: 20 }, () => ({ id: randomUUID(), arenaId: own.id, type, category: "QA", description, amountCents: 1 })); ids.push(...tiny.map(row => row.id));
      await admin.financialEntry.createMany({ data: tiny });
      const page = await actions.getAccountsLedgerPage(own.id, type, { description, sort: "amountCents", direction: "desc" }, { pageSize: "20" });
      assert.equal(page.total, 22);
      assert.equal(page.totalCents, 25420);
      assert.equal(page.entries.length, 20);
      assert.deepEqual(Array.from(page.entries.slice(0, 2), (row: any) => row.id), [a.id, b.id]);
      assert.deepEqual(JSON.parse(JSON.stringify(page.entries[0].composition)), { originalCents: 10000, interestCents: 4000, discountCents: 600, adjustedCents: 13400, creationKnown: true });
      assert.equal(page.entries[0].balance.outstandingCents, 9400);
      const second = await actions.getAccountsLedgerPage(own.id, type, { description, sort: "amountCents", direction: "desc" }, { page: "2", pageSize: "20" });
      assert.equal(second.totalCents, 25420);
      assert.equal(second.entries.length, 2);
      assert.ok(second.entries.every((row: any) => !page.entries.some((first: any) => row.id === first.id)));
      const asc = await actions.getAccountsLedgerPage(own.id, type, { description, sort: "amountCents", direction: "asc" }, { page: "2", pageSize: "20" });
      assert.deepEqual(Array.from(asc.entries, (row: any) => row.id), [b.id, a.id]);
      const target = await actions.getAccountsLedgerPage(own.id, type, { description, sort: "amountCents", direction: "asc" }, { entryId: a.id, pageSize: "20" });
      assert.equal(target.page, 2);
      assert.ok(target.entries.some((row: any) => row.id === a.id));
    }
  } finally {
    await admin.financialSettlement.deleteMany({ where: { financialEntryId: { in: ids } } });
    await admin.financialEntry.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
