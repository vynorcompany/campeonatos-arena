import assert from "node:assert/strict";
import test from "node:test";
import { courtBookingInputSchema, courtBookingOutcomeSchema } from "../src/lib/backend/contracts/court-booking";

test("booking contracts reject forged scope, duplicate fields and private response data", () => {
  assert.equal(courtBookingInputSchema("save").safeParse({ fields: { participants: ["[]"], courtId: ["own"] } }).success, true);
  for (const fields of [{ arenaId: ["foreign"] }, { userId: ["forged"] }, { courtId: ["one", "two"] }, { notes: ["a".repeat(65537)] }]) assert.equal(courtBookingInputSchema("save").safeParse({ fields }).success, false);
  assert.equal(courtBookingInputSchema("confirm").safeParse({ fields: { occurrenceId: ["own"], paymentMethod: ["CASH"] } }).success, false);
  assert.equal(courtBookingOutcomeSchema.safeParse({ error: null, version: "2026-11-27T12:00:00.000Z" }).success, true);
  assert.equal(courtBookingOutcomeSchema.safeParse({ error: null, providerToken: "private" }).success, false);
  assert.equal(courtBookingInputSchema("checkin").safeParse({ fields: { occurrenceId: ["own"], playerId: ["own"], actorId: ["forged"] } }).success, false);
  assert.equal(courtBookingInputSchema("open-slot").safeParse({ fields: { courtId: ["own"], arenaId: ["foreign"] } }).success, false);
  assert.equal(courtBookingOutcomeSchema.safeParse({ error: null, checkedInAt: "2026-11-27T12:00:00.000Z" }).success, true);
  assert.equal(courtBookingOutcomeSchema.safeParse({ error: null, charges: { version: "2026-11-27T12:00:00.000Z", totalAmountCents: 100, participants: [{ playerId: "own", amountCents: 100, paymentMethod: "", checkedInAt: null, accessToken: "private" }], services: [] } }).success, false);
});

test("booking facade invalidates after confirmation only and hides uncertain transport errors", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  let calendars = 0, finances = 0, calls = 0;
  let result: unknown = { error: null, version: "2026-11-27T12:00:00.000Z" };
  let failed = false;
  const source = readFileSync(new URL("../src/lib/calendar/booking-mutation.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, process: { env: { VX4_BACKEND_ORIGIN: "http://backend.invalid" } },
    require: (name: string) => name === "@/lib/calendar/revalidation" ? { refreshCalendarRoutes: () => { calendars++; } } : name === "@/lib/finance/revalidation" ? { refreshFinanceRoutes: () => { finances++; } } : name === "@/lib/backend/court-booking-client" ? { remoteCourtBookingMutation: async () => { calls++; if (failed) throw Error("secret provider detail"); return result; } } : {},
  });
  const run = exports.runCourtBookingMutation;
  await run("save", new FormData()); assert.deepEqual([calendars, finances, calls], [1, 1, 1]);
  result = { error: "Registro alterado." }; await run("save", new FormData()); assert.deepEqual([calendars, finances, calls], [1, 1, 2]);
  failed = true; assert.equal(JSON.stringify(await run("cancel", new FormData())).includes("secret provider detail"), false); assert.deepEqual([calendars, finances, calls], [1, 1, 3]);
  failed = false; result = { error: null }; const cancel = new FormData(); cancel.set("cancelOpenCharges", "yes"); await run("cancel", cancel); assert.deepEqual([calendars, finances, calls], [2, 2, 4]);
  await run("confirm", new FormData()); assert.deepEqual([calendars, finances, calls], [3, 2, 5]);
});
