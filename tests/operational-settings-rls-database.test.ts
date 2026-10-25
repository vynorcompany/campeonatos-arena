import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("operational RLS denies unscoped reads, foreign rows and cross-arena references", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    const arenas = [];
    for (const name of ["A", "B"]) { const arena = await admin.arena.create({ data: { name: `Operational RLS ${name}`, slug: `operational-rls-${randomUUID()}`, createdById: "goal-test" } }); arenas.push(arena); ids.push(arena.id); }
    const teachers = await Promise.all(arenas.map(arena => admin.teacher.create({ data: { arenaId: arena.id, name: "Teacher RLS" } })));
    const students = await Promise.all(arenas.map(arena => admin.student.create({ data: { arenaId: arena.id, name: "Student RLS" } })));
    const courts = await Promise.all(arenas.map(arena => admin.court.create({ data: { arenaId: arena.id, name: "Court RLS" } })));
    const groups = await Promise.all(arenas.map((arena, index) => admin.classGroup.create({ data: { arenaId: arena.id, name: "Group RLS", teacherId: teachers[index].id } })));
    const lessons = await Promise.all(arenas.map((arena, index) => admin.lesson.create({ data: { arenaId: arena.id, title: "Lesson RLS", teacherId: teachers[index].id } })));
    const db = arenaDatabaseForTest(runtime, arenas[0].id);
    assert.deepEqual(await runtime.teacher.findMany({ where: { arenaId: { in: ids } } }), []);
    assert.equal((await db.teacher.findMany()).length, 1);
    assert.equal(await db.student.findFirst({ where: { id: students[1].id } }), null);
    assert.equal(await db.court.findFirst({ where: { id: courts[1].id } }), null);
    await assert.rejects(db.teacher.update({ where: { id: teachers[1].id }, data: { name: "Forbidden" } }));
    await assert.rejects(db.teacherStudent.create({ data: { arenaId: arenas[0].id, teacherId: teachers[1].id, studentId: students[0].id } }));
    await assert.rejects(db.classGroupEnrollment.create({ data: { arenaId: arenas[0].id, classGroupId: groups[0].id, studentId: students[1].id } }));
    await assert.rejects(db.courtWeeklyRule.create({ data: { courtId: courts[1].id, weekday: 1, startsAtMinute: 600, endsAtMinute: 660, priceCents: 100 } }));
    await assert.rejects(db.lessonAttendance.create({ data: { lessonId: lessons[1].id, studentId: students[0].id } }));
    await assert.rejects(db.studentMonthlyBalance.create({ data: { arenaId: arenas[0].id, studentId: students[1].id, referenceMonth: "2026-10", totalClasses: 1, remainingClasses: 1 } }));
    await db.teacherStudent.create({ data: { arenaId: arenas[0].id, teacherId: teachers[0].id, studentId: students[0].id } });
    await db.arenaOperationalSettings.create({ data: { arenaId: arenas[0].id, printerPaper: "58MM" } });
    await admin.arenaOperationalSettings.create({ data: { arenaId: arenas[1].id, printerPaper: "A4" } });
    assert.equal((await db.arenaOperationalSettings.findMany()).length, 1);
    assert.equal(await db.arenaOperationalSettings.findUnique({ where: { arenaId: arenas[1].id } }), null);
    await assert.rejects(db.arenaOperationalSettings.update({ where: { arenaId: arenas[1].id }, data: { printerCopies: 3 } }));
    const tables = ["Court", "CourtWeeklyRule", "BookingType", "ScheduleBookingSeries", "CalendarEvent", "PortalAnnouncement", "PortalEventPost", "Teacher", "Student", "Lesson", "LessonAttendance", "Plan", "ClassGroup", "ClassGroupSchedule", "ClassGroupPlan", "ClassGroupEnrollment", "ClassGroupRequest", "ClassGroupMakeup", "TeacherStudent", "TeacherPlan", "StudentMonthlyBalance", "ArenaOperationalSettings"];
    const protectedTables = await admin.$queryRaw<{ relname: string }[]>`SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity AND relforcerowsecurity`;
    for (const table of tables) assert.ok(protectedTables.some(row => row.relname === table), `${table} must enforce RLS`);
  } finally { await admin.arena.deleteMany({ where: { id: { in: ids } } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
