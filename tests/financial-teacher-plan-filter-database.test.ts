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

test("todos os planos mantém as cobranças de um plano compartilhado com o professor correto", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: testUrl.replace("postgres@", "arena_runtime@") } } });
  const suffix = randomUUID();
  const entryIds: string[] = [];
  const planIds: string[] = [];
  const teacherIds: string[] = [];
  let recurrenceId = "";
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const teacherA = await admin.teacher.create({ data: { arenaId: arenaA.id, name: `Prof A ${suffix}` } });
    const teacherB = await admin.teacher.create({ data: { arenaId: arenaA.id, name: `Prof B ${suffix}` } });
    teacherIds.push(teacherA.id, teacherB.id);
    const shared = await admin.plan.create({ data: { arenaId: arenaA.id, name: `Compartilhado ${suffix}` } });
    const exclusive = await admin.plan.create({ data: { arenaId: arenaA.id, name: `Exclusivo ${suffix}` } });
    planIds.push(shared.id, exclusive.id);
    await admin.teacherPlan.createMany({ data: [
      { arenaId: arenaA.id, teacherId: teacherA.id, planId: shared.id },
      { arenaId: arenaA.id, teacherId: teacherB.id, planId: shared.id },
      { arenaId: arenaA.id, teacherId: teacherA.id, planId: exclusive.id },
    ] });
    const createEntry = async (arenaId: string, description: string, planId: string | null, teacherId: string | null, linkedRecurrenceId?: string) => {
      const entry = await admin.financialEntry.create({ data: {
        arenaId, type: "REVENUE", category: "Planos de aulas", description, amountCents: 1000,
        planId, teacherId, recurrenceId: linkedRecurrenceId ?? null,
      }, select: { id: true } });
      entryIds.push(entry.id);
      return entry.id;
    };
    const a = await createEntry(arenaA.id, "Plano compartilhado A", shared.id, teacherA.id);
    const b = await createEntry(arenaA.id, "Plano compartilhado B", shared.id, teacherB.id);
    const ambiguous = await createEntry(arenaA.id, "Plano compartilhado legado", shared.id, null);
    const legacy = await createEntry(arenaA.id, "Plano exclusivo legado", exclusive.id, null);
    const foreign = await createEntry(arenaB.id, "Outra arena", null, teacherA.id);
    const recurrence = await admin.financialRecurrence.create({ data: {
      arenaId: arenaA.id, type: "REVENUE", category: "Planos de aulas", description: "Recorrência atribuída", counterpartyName: "Teste",
      amountCents: 1000, frequency: "MONTHLY", startsAt: new Date("2038-01-01"), nextDueDate: new Date("2038-02-01"), teacherId: teacherA.id,
    }, select: { id: true } });
    recurrenceId = recurrence.id;
    const recurring = await createEntry(arenaA.id, "Recorrência sem atribuição no lançamento", null, null, recurrence.id);

    const source = readFileSync(new URL("../src/lib/finance/accounts.ts", import.meta.url), "utf8");
    const exports: Record<string, (arenaId: string, type: string, filters: { planId: string }) => Promise<Array<{ id: string }>>> = {};
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
    const forA = (await exports.getAccountsLedger(arenaA.id, "REVENUE", { planId: `teacher:${teacherA.id}` })).map((entry) => entry.id);
    const forB = (await exports.getAccountsLedger(arenaA.id, "REVENUE", { planId: `teacher:${teacherB.id}` })).map((entry) => entry.id);
    assert.equal(forA.includes(a), true);
    assert.equal(forA.includes(legacy), true);
    assert.equal(forA.includes(recurring), true);
    assert.equal(forA.includes(b) || forA.includes(ambiguous) || forA.includes(foreign), false);
    assert.equal(forB.includes(b), true);
    assert.equal(forB.includes(a) || forB.includes(ambiguous) || forB.includes(legacy), false);
  } finally {
    if (entryIds.length) await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    if (recurrenceId) await admin.financialRecurrence.delete({ where: { id: recurrenceId } });
    if (planIds.length) await admin.teacherPlan.deleteMany({ where: { planId: { in: planIds } } });
    if (planIds.length) await admin.plan.deleteMany({ where: { id: { in: planIds } } });
    if (teacherIds.length) await admin.teacher.deleteMany({ where: { id: { in: teacherIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
