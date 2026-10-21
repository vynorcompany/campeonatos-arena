import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type CalendarResponse = { body: unknown; status: number; headers?: Record<string, string> };

function loadCalendarRoute(input: {
  auth: { arenaId: string; playerId: string } | null;
  arena?: { id: string; name: string } | null;
  booking?: object | null;
  databaseError?: Error;
}) {
  const source = readFileSync(new URL("../src/app/api/reservar/[arenaSlug]/[occurrenceId]/calendario/route.ts", import.meta.url), "utf8");
  const exports: Record<string, (request: Request, props: { params: Promise<{ arenaSlug: string; occurrenceId: string }> }) => Promise<CalendarResponse>> = {};
  const queries: { arena: number; booking: number; bookingWhere?: Record<string, unknown> } = { arena: 0, booking: 0 };
  class ResponseStub {
    body: unknown;
    status: number;
    headers?: Record<string, string>;
    constructor(body: unknown, options?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = options?.status ?? 200;
      this.headers = options?.headers;
    }
    static json(body: unknown, options?: { status?: number }) { return new ResponseStub(body, options); }
  }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    Date,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: ResponseStub };
      if (name === "@/lib/auth/player-session") return { getPublicPlayerAuth: async () => input.auth };
      if (name === "@/lib/prisma") return { prisma: { arena: { findUnique: async () => { queries.arena++; return input.arena ?? null; } } } };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, operation: (tx: unknown) => Promise<unknown>) => {
        if (input.databaseError) throw input.databaseError;
        return operation({ scheduleOccurrence: { findFirst: async (args: { where: Record<string, unknown> }) => {
          queries.booking++;
          queries.bookingWhere = args.where;
          return input.booking ?? null;
        } } });
      } };
      if (name === "@/lib/calendar/arena-wall-clock") return { arenaWallClockToInstant: (value: Date) => value };
      throw new Error(`Import inesperado: ${name}`);
    },
  });
  return { get: () => exports.GET({} as Request, { params: Promise.resolve({ arenaSlug: "arena-a", occurrenceId: "reserva-a" }) }), queries };
}

test("calendário exige sessão do atleta sem consultar dados da arena", async () => {
  const route = loadCalendarRoute({ auth: null });
  assert.equal((await route.get()).status, 401);
  assert.equal(route.queries.arena, 0);
  assert.equal(route.queries.booking, 0);
});

test("calendário não consulta reserva quando a sessão é de outra arena", async () => {
  const route = loadCalendarRoute({ auth: { arenaId: "arena-b", playerId: "atleta-b" }, arena: { id: "arena-a", name: "Arena A" } });
  assert.equal((await route.get()).status, 404);
  assert.equal(route.queries.booking, 0);
});

test("falha de banco no calendário não é disfarçada como sessão expirada", async () => {
  const databaseError = new Error("database unavailable");
  const route = loadCalendarRoute({ auth: { arenaId: "arena-a", playerId: "atleta-a" }, arena: { id: "arena-a", name: "Arena A" }, databaseError });
  await assert.rejects(route.get(), (error: unknown) => error === databaseError);
});

test("reserva inexistente ou não confirmada continua inacessível", async () => {
  const route = loadCalendarRoute({ auth: { arenaId: "arena-a", playerId: "atleta-a" }, arena: { id: "arena-a", name: "Arena A" }, booking: null });
  assert.equal((await route.get()).status, 404);
  assert.equal(route.queries.bookingWhere?.status, "SCHEDULED");
});

test("atleta autorizado baixa apenas sua reserva confirmada", async () => {
  const route = loadCalendarRoute({
    auth: { arenaId: "arena-a", playerId: "atleta-a" },
    arena: { id: "arena-a", name: "Arena A" },
    booking: { id: "reserva-a", title: "Reserva", startsAt: new Date("2026-10-21T14:00:00.000Z"), endsAt: new Date("2026-10-21T15:00:00.000Z"), occurrenceCourts: [{ court: { name: "Quadra 1" } }] },
  });
  const response = await route.get();
  assert.equal(response.status, 200);
  assert.match(String(response.body), /BEGIN:VCALENDAR/);
  assert.match(String(response.body), /SUMMARY:Reserva · Arena A/);
  assert.equal(response.headers?.["Cache-Control"], "private, no-store");
  assert.equal(route.queries.bookingWhere?.arenaId, "arena-a");
  assert.equal((route.queries.bookingWhere?.participants as { some: { playerId: string } })?.some.playerId, "atleta-a");
});
