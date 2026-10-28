import * as operationalPolicy from "../src/lib/comandas/operational-policy";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { PrismaClient, type Prisma } from "@prisma/client";
const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = (() => { try { const url = new URL(databaseUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; } catch { return false; } })();
test("abrir comandas da reserva simultaneamente reutiliza uma comanda por atleta", { skip: !disposable }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runtimeUrl = new URL(databaseUrl); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const playerIds: string[] = []; let occurrenceId = "";
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    for (let index = 0; index < 2; index++) playerIds.push((await admin.player.create({ data: { arenaId: arena.id, name: `Comanda concorrente ${randomUUID()}` } })).id);
    const previous = await admin.comanda.create({ data: { arenaId: arena.id, playerId: playerIds[0], label: "Conta de ontem", code: randomUUID(), openedAt: new Date(Date.now() - 86400000), openedByUserId: "goal-test", openedByUserName: "Autor original" } });
    const occurrence = await admin.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "BOOKING", title: "Reserva de teste", startsAt: new Date(), endsAt: new Date(Date.now() + 3600000), responsiblePlayerId: playerIds[0], participants: { create: playerIds.map(playerId => ({ playerId })) } } }); occurrenceId = occurrence.id;
    const transact = (arenaId: string, run: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return run(tx); });
    const actions: Record<string, (form: FormData) => Promise<{ error?: string; comandaIds?: string[] }>> = {};
    const mocks: Record<string, unknown> = { "@/lib/comandas/operational-policy": operationalPolicy,
      zod: { z }, "next/cache": { revalidatePath() {} },
      "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id, userId: "goal-test", userName: "Operador GOAL" }) },
      "@/lib/rls": { withArenaTransaction: transact },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? {} });
    const open = (ids?: string[]) => { const form = new FormData(); form.set("occurrenceId", occurrenceId); if (ids) form.set("playerIds", JSON.stringify(ids)); return actions.openBookingComandasAction(form); };
    const selected = await open([playerIds[0]]);
    assert.equal(selected.error, undefined);
    assert.deepEqual(Array.from(selected.comandaIds ?? []), [previous.id]);
    assert.equal(await admin.comanda.count({ where: { playerId: playerIds[1] } }), 0);
    assert.match((await open(["foreign-player"])).error ?? "", /não pertence/);
    assert.match((await open([])).error ?? "", /Selecione ao menos/);
    assert.equal(await admin.comanda.count({ where: { playerId: playerIds[1] } }), 0);
    const outcomes = await Promise.all([open(), open()]);
    for (const result of outcomes) { assert.equal(result.error, undefined); assert.equal(result.comandaIds?.length, 2); assert(result.comandaIds?.includes(previous.id)); }
    assert.equal((await admin.comanda.findUniqueOrThrow({ where: { id: previous.id } })).openedByUserName, "Autor original");
    await open();
    for (const playerId of playerIds) assert.equal(await admin.comanda.count({ where: { arenaId: arena.id, playerId, status: "OPEN" } }), 1);
    const missing = new FormData(); missing.set("occurrenceId", "missing-booking");
    assert.match((await actions.openBookingComandasAction(missing)).error ?? "", /não encontrado/);
  } finally {
    await admin.comanda.deleteMany({ where: { playerId: { in: playerIds } } });
    if (occurrenceId) await admin.scheduleOccurrence.delete({ where: { id: occurrenceId } });
    await admin.player.deleteMany({ where: { id: { in: playerIds } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
