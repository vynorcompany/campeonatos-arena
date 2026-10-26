import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("tenant transaction entry points wait for a busy pool without losing isolation or explicit limits", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.searchParams.set("connection_limit", "1");
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = []; let ownerId = ""; let release: (() => void) | undefined; let blocker: Promise<unknown> | undefined;
  try {
    ownerId = (await admin.user.create({ data: { name: "QA scoped pool", email: `scoped-pool-${randomUUID()}@example.test`, passwordHash: "qa-only" } })).id;
    for (const name of ["Arena A", "Arena B"]) {
      const arena = await admin.arena.create({ data: { createdById: ownerId, name, slug: `scoped-pool-${randomUUID()}` } }); arenas.push(arena.id);
      await admin.product.create({ data: { arenaId: arena.id, name, priceCents: 500 } });
    }
    const source = readFileSync(new URL("../src/lib/rls.ts", import.meta.url), "utf8");
    const exports: { withArenaTransaction?: <T>(id: string, run: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T> } = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require(name: string) {
      if (name === "@/lib/prisma") return { prisma: runtime };
      if (name === "@/lib/audit/request-context") return { noteAuditArena() {} };
      throw Error(`Unexpected dependency ${name}`);
    } });
    let acquired!: () => void; const ready = new Promise<void>(resolve => { acquired = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    blocker = runtime.$transaction(async tx => { await tx.$queryRaw`SELECT 1`; acquired(); await hold; }, { timeout: 10_000 }); await ready;
    let settled = 0;
    const capture = <T,>(promise: PromiseLike<T>) => Promise.resolve(promise).then(value => { settled++; return { value }; }, error => { settled++; return { error }; });
    const a = arenaDatabaseForTest(runtime, arenas[0]);
    const pending = [capture(a.product.findMany({ select: { name: true } })), capture(exports.withArenaTransaction!(arenas[1], tx => tx.product.findMany({ select: { name: true } })))];
    await assert.rejects(a.$transaction(async tx => tx.product.count(), { maxWait: 100 }), /Unable to start a transaction/);
    await new Promise(resolve => setTimeout(resolve, 2400));
    assert.equal(settled, 0, "normal reads must still be waiting after the old two-second limit");
    release(); await blocker;
    assert.deepEqual(await Promise.all(pending), [{ value: [{ name: "Arena A" }] }, { value: [{ name: "Arena B" }] }]);
    assert.equal(await runtime.product.count(), 0, "transaction-local arena must not leak to unscoped queries");
  } finally {
    release?.(); await blocker?.catch(() => {});
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    if (ownerId) await admin.user.delete({ where: { id: ownerId } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
