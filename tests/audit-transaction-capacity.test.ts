import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { auditedDatabase } from "../src/lib/audit/database-client";
import type { AuditRequestContext } from "../src/lib/audit/request-context";

test("scoped reads use a bounded connection queue and preserve caller transaction settings", async () => {
  const contexts = new AsyncLocalStorage<AuditRequestContext>();
  const key = Symbol.for("arena.http-audit.context");
  const globals = globalThis as any, previous = globals[key]; globals[key] = contexts;
  const configurations: any[] = [], scopes: unknown[][] = [];
  const tx = { $executeRaw: async (...args: unknown[]) => { scopes.push(args); }, player: { count: async () => 1 } };
  const base = { player: tx.player, $transaction: async (run: (value: unknown) => Promise<unknown>, options: unknown) => { configurations.push(options); return run(tx); } };
  try {
    const client = auditedDatabase(base as unknown as PrismaClient);
    await contexts.run({ arenaId: "arena-a", arenaIds: new Set() }, async () => {
      assert.equal(await client.player.count(), 1);
      assert.equal(configurations[0].maxWait, 10_000);
      assert.ok(scopes.some(args => args.includes("arena-a")), "queued reads retain tenant scope");
      await client.$transaction(async database => database.player.count(), { maxWait: 250, timeout: 800 });
      assert.equal(configurations[1].maxWait, 250);
      assert.equal(configurations[1].timeout, 800);
    });
  } finally { globals[key] = previous; }
});
