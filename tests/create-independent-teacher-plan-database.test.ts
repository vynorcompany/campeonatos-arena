import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { createIndependentTeacherPlan } from "../src/lib/academy/create-teacher-plan";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("new and duplicated teacher plans are independent, atomic and scoped without changing contracts or billing", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = []; let ownerId = "";
  const scope = <T>(arenaId: string, run: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return run(tx); });
  try {
    ownerId = (await admin.user.create({ data: { name: "Plan creation QA", email: `plan-create-${randomUUID()}@example.test`, passwordHash: "qa-only" } })).id;
    for (let i = 0; i < 2; i++) ids.push((await admin.arena.create({ data: { name: "Plan creation QA", slug: `plan-create-${randomUUID()}`, createdById: ownerId } })).id);
    const teachers = await Promise.all(ids.map(arenaId => admin.teacher.create({ data: { arenaId, name: "Teacher QA" } })));
    const input = { teacherId: teachers[0].id, name: "Novo plano independente", monthlyPrice: "790,00", classesPerMonth: 4, notes: "Plano QA" };
    const original = await scope(ids[0], tx => createIndependentTeacherPlan(tx, ids[0], ownerId, input));
    const student = await admin.student.create({ data: { arenaId: ids[0], name: "Student QA", remainingClasses: 4 } });
    const contract = await admin.studentSubscription.create({ data: { arenaId: ids[0], studentId: student.id, planId: original.id, monthlyPriceCents: 70000, classesPerMonth: 4 } });
    const charge = await admin.financialEntry.create({ data: { arenaId: ids[0], planId: original.id, type: "REVENUE", category: "Plano", description: "Original contract QA", amountCents: 70000 } });
    const copy = await scope(ids[0], tx => createIndependentTeacherPlan(tx, ids[0], ownerId, { ...input, name: `${input.name} (cópia)`, monthlyPrice: "850,00", classesPerMonth: 8 }));
    assert.notEqual(copy.id, original.id);
    assert.equal(copy.monthlyPriceCents, 85000);
    assert.equal(copy.classesPerMonth, 8);
    assert.equal(copy.notes, original.notes);
    assert.equal(copy.createdByUserId, ownerId);
    assert.deepEqual(await admin.plan.findUniqueOrThrow({ where: { id: original.id } }), original);
    assert.deepEqual(await admin.studentSubscription.findUniqueOrThrow({ where: { id: contract.id } }), contract);
    assert.deepEqual(await admin.financialEntry.findUniqueOrThrow({ where: { id: charge.id } }), charge);
    assert.equal(await admin.studentSubscription.count({ where: { planId: copy.id } }), 0);
    assert.equal(await admin.financialEntry.count({ where: { planId: copy.id } }), 0);
    assert.equal((await admin.teacherPlan.findUniqueOrThrow({ where: { teacherId_planId: { teacherId: teachers[0].id, planId: copy.id } } })).monthlyPriceCents, 85000);
    await assert.rejects(scope(ids[0], tx => createIndependentTeacherPlan(tx, ids[0], ownerId, { ...input, name: "Foreign teacher", teacherId: teachers[1].id })), /Professor não encontrado/);
    await assert.rejects(scope(ids[0], tx => createIndependentTeacherPlan(tx, ids[0], ownerId, { ...input, name: "Negative price", monthlyPrice: "-10,00" })), /Valor inválido/);
    await assert.rejects(scope(ids[0], tx => createIndependentTeacherPlan(tx, ids[0], ownerId, input)), /Unique constraint/);
    assert.equal(await admin.plan.count({ where: { arenaId: ids[0] } }), 2);
    assert.equal(await admin.teacherPlan.count({ where: { arenaId: ids[0] } }), 2);
    const other = await scope(ids[1], tx => createIndependentTeacherPlan(tx, ids[1], ownerId, { ...input, teacherId: teachers[1].id }));
    assert.equal(other.arenaId, ids[1]);
    assert.equal(await scope(ids[0], tx => tx.plan.count({ where: { id: other.id } })), 0);
  } finally {
    await admin.studentSubscription.deleteMany({ where: { arenaId: { in: ids } } });
    await admin.financialEntry.deleteMany({ where: { arenaId: { in: ids } } });
    await admin.arena.deleteMany({ where: { id: { in: ids } } });
    if (ownerId) await admin.user.delete({ where: { id: ownerId } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
