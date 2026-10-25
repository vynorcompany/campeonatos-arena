import { arenaDatabaseForTest } from "./helpers/arena-database";
import { registerLessonCheckin } from "../src/lib/checkin/lesson";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("pedidos simultâneos de turma criam uma única solicitação na arena do atleta", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  let playerId = "";
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const groupA = await admin.classGroup.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arenaA.id, name: "Turma GOAL Iniciante - Manhã" } }, select: { id: true } });
    const groupB = await admin.classGroup.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arenaB.id, name: "Turma Exclusiva Outra Arena GOAL" } }, select: { id: true } });
    const player = await admin.player.create({ data: { arenaId: arenaA.id, name: `Atleta Concorrente GOAL ${randomUUID()}` }, select: { id: true, name: true } });
    playerId = player.id;

    const source = readFileSync(new URL("../src/lib/actions/class-groups.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/checkin/lesson": { registerLessonCheckin },
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arenaA.id, playerId, name: player.name, phone: "", email: "" }) },
      "@/lib/auth/guards": {},
      "@/lib/finance/recurrences": {},
      "@/lib/calendar/court-slot-availability": {},
      "@/lib/calendar/arena-wall-clock": {},
      "@/lib/payments/recurring-online-charges": {},
      "@/lib/academy/class-group-capacity": {},
      "@/lib/academy/subscription-lock": {},
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) },
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, FormData, console,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Import inesperado: ${name}`); return mocks[name]; },
    });
    const request = (classGroupId: string) => {
      const form = new FormData();
      form.set("arenaSlug", "arena-teste-goal");
      form.set("classGroupId", classGroupId);
      return exports.requestClassGroupAction(form);
    };

    const results = await Promise.allSettled([request(groupA.id), request(groupA.id)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.equal(rejected?.status, "rejected");
    assert.match(String(rejected.reason), /já está em análise/);
    const requests = await admin.classGroupRequest.findMany({ where: { student: { playerId } }, select: { arenaId: true, classGroupId: true, status: true } });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], { arenaId: arenaA.id, classGroupId: groupA.id, status: "PENDING" });

    await assert.rejects(request(groupB.id), /Esta turma não está disponível/);
    assert.equal(await admin.classGroupRequest.count({ where: { arenaId: arenaB.id, student: { playerId } } }), 0);
  } finally {
    if (playerId) {
      await admin.classGroupRequest.deleteMany({ where: { student: { playerId } } });
      await admin.student.deleteMany({ where: { playerId } });
      await admin.player.delete({ where: { id: playerId } });
    }
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
