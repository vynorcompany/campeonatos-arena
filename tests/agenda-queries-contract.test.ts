import assert from "node:assert/strict";
import test from "node:test";
import { agendaAvailabilityInputSchema, agendaAvailabilitySchema, agendaVersionSchema } from "../src/lib/backend/contracts/agenda-queries";
import { agendaDayInputSchema } from "../src/lib/backend/contracts/agenda-day";
import { backendOrigin } from "../src/lib/backend/http-client";
import { bookingStartOptions, bookingDurationOptions } from "../src/lib/calendar/booking-time-selection";

test("agenda query contracts reject invalid dates, scope injection and private response fields", () => {
  assert.equal(agendaAvailabilityInputSchema.safeParse({ courtId: "own", date: "2026-12-07" }).success, true);
  for (const value of [{ courtId: "own", date: "2026-02-29" }, { courtId: "own", date: "2026-12-07", arenaId: "other" }, { courtId: "own", date: "2026-12-07", occurrenceId: "" }]) assert.equal(agendaAvailabilityInputSchema.safeParse(value).success, false);
  assert.equal(agendaAvailabilitySchema.safeParse({ slotMinutes: 30, availableMinutes: [480, 510] }).success, true);
  assert.equal(agendaAvailabilitySchema.safeParse({ slotMinutes: 30, availableMinutes: [], checkinToken: "private" }).success, false);
  assert.equal(agendaVersionSchema.safeParse({ version: "a".repeat(64), accessToken: "private" }).success, false);
});

test("existing booking time stays selectable after availability changes without opening it to new bookings", () => {
  const retained = { startMinute: 540, durationMinutes: 60 };
  assert.deepEqual(bookingStartOptions([480, 510], retained), [480, 510, 540]);
  assert.deepEqual(bookingDurationOptions({ startMinute: 540, slotMinutes: 30, availableMinutes: [480, 510], retained }), [60]);
  assert.deepEqual(bookingStartOptions([], retained), [540]);
  assert.deepEqual(bookingStartOptions([480, 510]), [480, 510]);
  assert.deepEqual(bookingDurationOptions({ startMinute: 540, slotMinutes: 30, availableMinutes: [480, 510] }), []);
  assert.deepEqual(bookingDurationOptions({ startMinute: 480, slotMinutes: 30, availableMinutes: [480, 510], retained: { startMinute: 540, durationMinutes: 90 } }), [30, 60]);
  assert.deepEqual(bookingDurationOptions({ startMinute: 545, slotMinutes: 30, availableMinutes: [], retained: { startMinute: 545, durationMinutes: 45 } }), [45]);
});

test("agenda gateway relays only a validated query, preserves authorization errors and fails closed", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const exports: Record<string, (request: unknown, area: string) => Promise<Response>> = {};
  let calls = 0, status = 200, failed = false;
  let payload: unknown = { slotMinutes: 30, availableMinutes: [480] };
  const source = readFileSync(new URL("../src/lib/backend/agenda-query-gateway.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, URLSearchParams, AbortSignal, Error, process: { env: { VX4_BACKEND_ORIGIN: "https://backend.invalid" } },
    fetch: async (url: URL, init: RequestInit) => { calls++; assert.equal(url.origin, "https://backend.invalid"); assert.equal(url.pathname, "/api/management/agenda/availability"); assert.equal(url.searchParams.get("courtId"), "own"); assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "manual"); if (failed) throw Error("private driver detail"); return new Response(JSON.stringify(payload), { status }); },
    require: (name: string) => name === "next/server" ? { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } } : name === "./http-client" ? { backendOrigin } : name === "./management-context-client" ? { managementCookieHeader: async () => "padel_session=synthetic" } : name === "./contracts/agenda-queries" ? { agendaAvailabilityInputSchema, agendaAvailabilitySchema, agendaVersionSchema } : name === "./contracts/agenda-day" ? { agendaDayInputSchema } : {},
  });
  const request = { nextUrl: { searchParams: new URLSearchParams({ courtId: "own", date: "2026-12-07" }) } };
  const forward = exports.forwardAgendaQuery;
  assert.equal((await forward(request, "availability")).status, 200);
  status = 403; assert.equal((await forward(request, "availability")).status, 403);
  status = 307; assert.equal((await forward(request, "availability")).status, 401);
  status = 200; payload = { slotMinutes: 30, availableMinutes: [], passwordHash: "private" }; assert.equal((await forward(request, "availability")).status, 502);
  failed = true; const unavailable = await forward(request, "availability"); assert.equal(unavailable.status, 502); assert.equal((await unavailable.text()).includes("private driver detail"), false);
  assert.equal(calls, 5);
  assert.equal((await forward({ nextUrl: { searchParams: new URLSearchParams("courtId=own&date=2026-12-07&date=2026-12-08") } }, "availability")).status, 400);
  assert.equal(calls, 5);
});
