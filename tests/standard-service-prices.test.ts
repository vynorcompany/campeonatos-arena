import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { standardServiceCode, standardServicePrices } from "../src/lib/calendar/standard-services";

const require = createRequire(import.meta.url);
function action(allowed = true) {
  const source = readFileSync(new URL("../src/lib/actions/standard-service-prices.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const writes: Record<string, any>[] = [];
  const refreshed: string[] = [];
  const exports: Record<string, (form: FormData) => Promise<void>> = {};
  vm.runInNewContext(output, { exports, FormData, require: (name: string) => {
    if (name === "next/cache") return { revalidatePath: (path: string) => refreshed.push(path) };
    if (name === "@/lib/auth/guards") return { requireModuleEdit: async (module: string) => { assert.equal(module, "stock"); if (!allowed) throw new Error("Sem permissão"); return { arenaId: "authorized-arena", userId: "editor" }; } };
    if (name === "@/lib/rls") return { withArenaTransaction: async (arenaId: string, operation: (tx: unknown) => unknown) => { assert.equal(arenaId, "authorized-arena"); return operation({ arenaServicePrice: { upsert: async (args: Record<string, any>) => { writes.push(args); return args.create; } } }); } };
    return require(name);
  } });
  return { save: exports.updateStandardServicePriceAction, writes, refreshed };
}
function input(code: string, price: string) { const form = new FormData(); form.set("serviceCode", code); form.set("price", price); return form; }

test("standard service prices are scoped to the authorized arena and only update price", async () => {
  const handler = action();
  const form = input("LEAGUE", "40,50");
  form.set("arenaId", "another-arena"); form.set("name", "Renamed"); form.set("active", "false");
  await handler.save(form);
  const write = handler.writes[0];
  assert.equal(write.where.arenaId_serviceCode.arenaId, "authorized-arena");
  assert.equal(write.create.serviceCode, "LEAGUE");
  assert.equal(write.update.priceCents, 4050);
  assert.deepEqual(Object.keys(write.update).sort(), ["priceCents", "updatedByUserId"]);
  assert.deepEqual(handler.refreshed, ["/pdv", "/agenda"]);
});

test("zero is a configured free service, while an absent price remains unconfigured", async () => {
  const handler = action(); await handler.save(input("SUPER12", "0,00"));
  assert.equal(handler.writes[0].create.priceCents, 0);
  assert.deepEqual(standardServicePrices([{ serviceCode: "SUPER12", priceCents: 0 }]), { SUPER12: 0 });
  assert.equal(standardServicePrices([]).LEAGUE, undefined);
  assert.equal(standardServiceCode(" liga "), "LEAGUE");
  assert.equal(standardServiceCode("Reserva"), undefined);
});

test("invalid, negative and overflowing amounts and unknown services never write", async () => {
  const handler = action();
  for (const [code, price] of [["CUSTOM", "40,00"], ["LEAGUE", "-1"], ["LEAGUE", "abc"], ["LEAGUE", "40,001"], ["LEAGUE", "21474836,48"], ["LEAGUE", ""]]) await assert.rejects(handler.save(input(code, price)));
  assert.equal(handler.writes.length, 0);
});

test("a viewer cannot change standard service prices", async () => {
  const handler = action(false);
  await assert.rejects(handler.save(input("LEAGUE", "40,00")), /Sem permissão/);
  assert.equal(handler.writes.length, 0);
});
