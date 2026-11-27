import assert from "node:assert/strict";
import test from "node:test";
import { calendarManagementInputSchema, calendarManagementOutcomeSchema } from "../src/lib/backend/contracts/calendar-management";

test("calendar mutations reject authority injection, duplicate values and oversized text", () => {
  const schema = calendarManagementInputSchema("event-create");
  assert.equal(schema.safeParse({ fields: { title: ["Evento"], eventType: ["EVENTO"] } }).success, true);
  for (const fields of [{ arenaId: ["foreign"] }, { title: ["one", "two"] }, { title: ["a".repeat(16385)] }, { sourceType: ["lesson"] }]) assert.equal(schema.safeParse({ fields }).success, false);
  assert.equal(schema.safeParse({ fields: {}, userId: "forged" }).success, false);
  assert.equal(calendarManagementInputSchema("event-delete").safeParse({ fields: { calendarEventId: ["own"], title: ["ignored"] } }).success, false);
});

test("calendar mutation responses cannot accidentally disclose client credentials", () => {
  assert.equal(calendarManagementOutcomeSchema.safeParse({ error: null, id: "client", name: "Cliente" }).success, true);
  assert.equal(calendarManagementOutcomeSchema.safeParse({ error: null, id: "client", passwordHash: "private" }).success, false);
  assert.equal(calendarManagementOutcomeSchema.safeParse({ error: null, accessToken: "private" }).success, false);
});

test("calendar frontend refreshes only confirmed writes and keeps quick-client result shape", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const source = readFileSync(new URL("../src/lib/calendar/management-mutation.ts", import.meta.url), "utf8");
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  let refreshes = 0;
  let result: unknown = { error: null };
  let failed = false;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, process: { env: { VX4_BACKEND_ORIGIN: "http://backend.invalid" } },
    require: (name: string) => name === "@/lib/calendar/revalidation" ? { refreshCalendarRoutes: () => { refreshes++; } } : name === "@/lib/backend/calendar-management-client" ? { remoteCalendarManagementMutation: async () => { if (failed) throw Error("private transport error"); return result; } } : {},
  });
  const run = exports.runCalendarManagementMutation;
  assert.equal(await run("event-create", new FormData()), undefined);
  assert.equal(refreshes, 1);
  result = { error: "Revise o título." };
  assert.equal((await run("event-update", new FormData()) as { error: string }).error, "Revise o título.");
  assert.equal(refreshes, 1);
  failed = true;
  assert.equal(JSON.stringify(await run("event-delete", new FormData())).includes("private transport error"), false);
  assert.equal(refreshes, 1);
  failed = false;
  result = { error: null, id: "p", name: "Cliente Novo" };
  assert.equal(JSON.stringify(await run("client-create", new FormData())), JSON.stringify({ id: "p", name: "Cliente Novo" }));
  assert.equal(refreshes, 2);
  result = { error: null };
  assert.ok((await run("client-create", new FormData()) as { error: string }).error);
  assert.equal(refreshes, 2);
});
