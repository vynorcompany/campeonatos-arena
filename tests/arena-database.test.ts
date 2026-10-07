import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";

function fixture() {
  const events: string[] = [];
  const rows: string[] = [];
  const base = { product: {}, async $transaction(run: (tx: any) => Promise<unknown>) {
    const saved = [...rows]; let arena = "";
    const tx = {
      async $executeRaw(_strings: unknown, id: string) { arena = id; events.push("scope:" + id); },
      product: { async findMany() { events.push("read:" + arena); return [arena]; }, async create({ data }: {data: { name: string }}) { if (data.name === "fail") throw Error("write failed"); rows.push(arena + ":" + data.name); return data; } }
    };
    try { return await run(tx); } catch (error) { rows.splice(0, rows.length, ...saved); throw error; }
  } };
  const source = readFileSync(new URL("../src/lib/arena-database.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: {arenaDatabase?: (arenaId: string) => any} = {};
  vm.runInNewContext(output, { exports, require: () => ({ prisma: base }), WeakMap, Map, Proxy, Reflect, Symbol, Promise });
  return { db: exports.arenaDatabase!, events, rows };
}

test("arena operations stay lazy and bind their own transaction-local context", async () => {
  const { db, events } = fixture(); const a = db("arena-a"), b = db("arena-b");
  const first = a.product.findMany(); assert.equal(events.length, 0);
  assert.deepEqual(await Promise.all([first, b.product.findMany()]), [["arena-a"], ["arena-b"]]);
  assert.deepEqual(events.sort(), ["read:arena-a", "read:arena-b", "scope:arena-a", "scope:arena-b"]);
  await first; assert.equal(events.length, 4, "the same operation must not run twice");
});

test("arena batches are atomic and reject operations from another arena", async () => {
  const { db, rows } = fixture(); const a = db("arena-a"), b = db("arena-b");
  await assert.rejects(a.$transaction([a.product.create({data:{name:"ok"}}), a.product.create({data:{name:"fail"}})]), /write failed/);
  assert.equal(rows.length, 0);
  assert.throws(() => a.$transaction([b.product.create({data:{name:"wrong arena"}})]), /mesma arena/);
  assert.equal(rows.length, 0);
});

test("interactive arena transactions bind context once and rollback on failure", async () => {
  const { db, events, rows } = fixture(); const a = db("arena-a");
  await assert.rejects(a.$transaction(async (tx: any) => { await tx.product.create({data:{name:"ok"}}); await tx.product.create({data:{name:"fail"}}); }), /write failed/);
  assert.equal(rows.length, 0); assert.deepEqual(events, ["scope:arena-a"]);
  assert.throws(() => db(" "), /arena ativa/);
  assert.throws(() => a.$disconnect(), /administrativa/);
});
