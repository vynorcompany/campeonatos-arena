import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { canPerformPermission } from "../src/lib/permissions";
import { parseArenaAssistantCommand } from "../src/lib/assistant/commands";
import { arenaToday } from "../src/lib/calendar/arena-wall-clock";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("assistant tenant isolation, financial permission and atomic invoice audit are enforced", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    for (const label of ["A", "B"]) ids.push((await admin.arena.create({ data: { name: `Assistant RLS ${label}`, slug: `assistant-rls-${randomUUID()}`, createdById: "goal-test" } })).id);
    const conversations = await Promise.all(ids.map(arenaId => admin.assistantConversation.create({ data: { arenaId, userId: "operator" } })));
    await admin.assistantMessage.create({ data: { conversationId: conversations[1].id, role: "USER", content: "Foreign private message" } });
    const scoped = arenaDatabaseForTest(runtime, ids[0]);
    assert.deepEqual(await runtime.assistantConversation.findMany({ where: { arenaId: { in: ids } } }), []);
    assert.deepEqual(await scoped.assistantMessage.findMany({ where: { conversationId: conversations[1].id } }), []);
    await assert.rejects(scoped.assistantMessage.create({ data: { conversationId: conversations[1].id, role: "USER", content: "Cross tenant injection" } }));
    await assert.rejects(scoped.assistantCommand.create({ data: { arenaId: ids[0], conversationId: conversations[1].id, requestedByUserId: "operator", type: "TEST", input: "Cross tenant" } }));
    await assert.rejects(scoped.assistantCommand.create({ data: { arenaId: ids[0], conversationId: conversations[0].id, requestedByUserId: "different-operator", type: "TEST", input: "False attribution" } }));
    const player = await admin.player.create({ data: { arenaId: ids[0], name: "Cliente Assistente QA" } });
    const auth = { arenaId: ids[0], userId: "operator", userName: "Operator QA", arenaRole: "ADMIN", systemRole: "VIEWER", editPermissions: [] as string[] };
    let databaseCalls = 0, failAudit = false;
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requireRole: async () => auth },
      "@/lib/permissions": { canPerformPermission }, "@/lib/assistant/commands": { parseArenaAssistantCommand },
      "@/lib/calendar/arena-wall-clock": { arenaToday },
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => { databaseCalls++; assert.equal(arenaId, ids[0]); return scoped; } },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: any) => Promise<unknown>) => runtime.$transaction(async tx => {
        assert.equal(arenaId, ids[0]); await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        const proxy = new Proxy(tx, { get(target, key) {
          if (key !== "assistantCommand" || !failAudit) return Reflect.get(target, key);
          return new Proxy(tx.assistantCommand, { get(delegate, method) {
            if (method === "update") return async (args: any) => { if (args.data.status === "EXECUTED") throw new Error("audit-write-failure"); return delegate.update(args); };
            return Reflect.get(delegate, method);
          } });
        } });
        return operation(proxy);
      }) },
    };
    const actions: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/arena-assistant.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, Date, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
    const command = "Crie uma fatura no valor de 10,00 para o cliente Cliente Assistente QA.";
    await assert.rejects(actions.runArenaAssistantCommandAction(command), /Sem permissão para criar/);
    assert.equal(databaseCalls, 0);
    assert.equal(await admin.assistantCommand.count({ where: { arenaId: ids[0] } }), 0);
    auth.editPermissions = ["finance:receivable:create"];
    await assert.rejects(actions.runArenaAssistantCommandAction("x".repeat(2001)), /2.000/);
    assert.equal(databaseCalls, 0);
    failAudit = true;
    await assert.rejects(actions.runArenaAssistantCommandAction(command), /audit-write-failure/);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: ids[0] } }), 0, "invoice rolls back with its execution audit");
    failAudit = false;
    assert.equal((await actions.runArenaAssistantCommandAction(command)).ok, true);
    const entry = await admin.financialEntry.findFirstOrThrow({ where: { arenaId: ids[0] } });
    assert.equal(entry.playerId, player.id); assert.equal(entry.amountCents, 1000); assert.equal(entry.source, "ASSISTANT");
    const audit = await admin.assistantCommand.findFirstOrThrow({ where: { arenaId: ids[0], status: "EXECUTED" } });
    assert.equal(audit.targetId, entry.id); assert.equal(entry.externalReference, audit.id);
  } finally {
    await admin.arena.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
