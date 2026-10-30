import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import { getFormValues } from "../src/lib/academy/inputs";
import { instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { registerLessonCheckin } from "../src/lib/checkin/lesson";
import * as credits from "../src/lib/academy/lesson-credits";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("conclusão relê o check-in após obter a trava, sem duplicar presença ou descontar créditos outra vez", { skip: !local }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const runtime = new PrismaClient({ datasources: { db: { url: url.replace("postgres@", "arena_runtime@") } } });
  const scope = <T>(arenaId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.arena_id',${arenaId},true)`;
    return fn(tx);
  });
  let ownerId = "", arenaId = "";
  try {
    ownerId = (await db.user.create({ data: { name: "Conclusão QA", email: `completion-${randomUUID()}@example.test`, passwordHash: "disabled" } })).id;
    arenaId = (await db.arena.create({ data: { name: "Conclusão QA", slug: `completion-${randomUUID()}`, createdById: ownerId } })).id;
    const player = await db.player.create({ data: { arenaId, name: "Aluno QA" } });
    const student = await db.student.create({ data: { arenaId, playerId: player.id, name: player.name, remainingClasses: 2 } });
    const now = new Date();
    const lesson = await db.lesson.create({ data: { arenaId, title: "Aula QA", scheduledAt: instantToArenaWallClock(now), durationMinutes: 60, attendances: { create: { studentId: student.id } } } });
    let checkedIn = false;
    const exports: { completeLessonAction?: (form: FormData) => Promise<unknown> } = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId, userId: ownerId }) },
      "@/lib/arena-database": { arenaDatabase: () => ({ $transaction: (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => scope(arenaId, fn) }) },
      "@/lib/academy/inputs": { getFormValues },
      "@/lib/academy/lesson-credits": credits,
      "@/lib/academy/revalidation": { refreshAcademyRoutes() {} },
      "@/lib/rls": { withArenaTransaction: async (id: string, fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const snapshot = await scope(id, fn);
        if (!checkedIn) {
          checkedIn = true;
          await scope(id, tx => registerLessonCheckin(tx, { arenaId, playerId: player.id, lessonId: lesson.id }, now));
        }
        return snapshot;
      } },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Set, require: (name: string) => mocks[name] ?? {} });
    const form = new FormData(); form.set("lessonId", lesson.id);
    await exports.completeLessonAction!(form);
    const actual = await db.student.findUniqueOrThrow({ where: { id: student.id } });
    assert.equal(actual.remainingClasses, 1);
    assert.equal(actual.attendedClasses, 1);
    assert.equal((await db.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).status, "COMPLETED");
    await assert.rejects(exports.completeLessonAction!(form), /já foi concluída/);
  } finally {
    if (arenaId) await db.arena.delete({ where: { id: arenaId } });
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    await runtime.$disconnect(); await db.$disconnect();
  }
});
