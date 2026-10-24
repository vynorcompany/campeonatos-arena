import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { registerLessonCheckin, registerQrLessonCheckin } from "../src/lib/checkin/lesson";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("QR de aulas respeita arena, matrícula, janela, saldo e concorrência com o Portal", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  try {
    const token = randomBytes(32).toString("hex");
    const arena = await admin.arena.create({ data: { slug: `lesson-qr-${randomUUID()}`, name: "Aulas QA", createdById: "goal-test", checkinEnabled: true, checkinToken: token } }); arenas.push(arena.id);
    const other = await admin.arena.create({ data: { slug: `lesson-other-${randomUUID()}`, name: "Outra arena QA", createdById: "goal-test" } }); arenas.push(other.id);
    const player = await admin.player.create({ data: { arenaId: arena.id, name: "Aluno QR QA" } });
    const stranger = await admin.player.create({ data: { arenaId: arena.id, name: "Sem matrícula QA" } });
    const student = await admin.student.create({ data: { arenaId: arena.id, playerId: player.id, name: player.name, remainingClasses: 2 } });
    const now = new Date(); const wall = instantToArenaWallClock(now);
    const create = (offset=0, tenant=arena.id, status="SCHEDULED") => admin.lesson.create({ data: { arenaId: tenant, title: "Aula QR QA", scheduledAt: new Date(wall.getTime()+offset), status, ...(tenant===arena.id ? { attendances: { create: { studentId: student.id, status: "PENDING" } } } : {}) } });
    const lesson = await create();
    const input = { arenaId: arena.id, playerId: player.id, lessonId: lesson.id, token };
    const run = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`; return fn(tx); });
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,{...input,token:"invalid"},now)),/QR Code/);
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,{...input,playerId:stranger.id},now)),/não está disponível/);
    const foreign = await create(0,other.id);
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,{...input,lessonId:foreign.id},now)),/não está disponível/);
    for (const hours of [4,-9]) {
      const outside = await create(hours*3600000);
      await assert.rejects(run(tx=>registerQrLessonCheckin(tx,{...input,lessonId:outside.id},now)),/três horas/);
    }
    const canceled = await create(0,arena.id,"CANCELED");
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,{...input,lessonId:canceled.id},now)),/não está disponível/);
    await Promise.all([run(tx=>registerQrLessonCheckin(tx,input,now)),run(tx=>registerLessonCheckin(tx,input,now))]);
    let persisted = await admin.student.findUniqueOrThrow({where:{id:student.id}});
    assert.equal(persisted.remainingClasses,1); assert.equal(persisted.attendedClasses,1);
    assert.ok((await admin.lessonAttendance.findUniqueOrThrow({where:{lessonId_studentId:{lessonId:lesson.id,studentId:student.id}}})).checkedInAt);
    const second = await create(); const third = await create();
    const competing = await Promise.allSettled([run(tx=>registerQrLessonCheckin(tx,{...input,lessonId:second.id},now)),run(tx=>registerQrLessonCheckin(tx,{...input,lessonId:third.id},now))]);
    assert.equal(competing.filter(item=>item.status==="fulfilled").length,1);
    persisted = await admin.student.findUniqueOrThrow({where:{id:student.id}});
    assert.equal(persisted.remainingClasses,0); assert.equal(persisted.attendedClasses,2);
    assert.equal(await admin.auditEvent.count({where:{arenaId:arena.id,action:"LESSON_CHECKIN"}}),2);
    await admin.arena.update({where:{id:arena.id},data:{checkinToken:randomBytes(32).toString("hex")}});
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,input,now)),/QR Code/);
    await admin.arena.update({where:{id:arena.id},data:{checkinToken:token,checkinEnabled:false}});
    await assert.rejects(run(tx=>registerQrLessonCheckin(tx,input,now)),/QR Code/);
  } finally { await admin.arena.deleteMany({where:{id:{in:arenas}}}); await runtime.$disconnect(); await admin.$disconnect(); }
});
