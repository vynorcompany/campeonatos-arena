import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
export async function assertAcademySmoke(db, origin, arenaId, cookie, staffId, planId) {
  const post = (operation, fields, path = 'management', originHeader = 'http://127.0.0.1:3014', requestCookie = cookie) => fetch(`${origin}/api/${path}/academy/actions/${operation}`, { method: 'POST', headers: { cookie: requestCookie, origin: originHeader, 'content-type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])) }) });
  const studentFields = { name: 'Aluno Academia Contrato', playerId: '', phone: '', email: '', remainingClasses: '2', notes: '' };
  assert.equal((await post('create-student', studentFields)).status, 403, 'Financial permission cannot create academy students');
  const member = await db.arenaMember.findFirstOrThrow({ where: { arenaId, userId: staffId } });
  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: [...member.editPermissions, 'students', 'teachers', 'lessons'] } });
  assert.equal((await post('create-student', { ...studentFields, arenaId: 'forged' })).status, 400);
  assert.equal((await post('create-student', studentFields, 'management', 'https://foreign.invalid')).status, 403);
  const created = await post('create-student', studentFields); assert.equal(created.status, 200, await created.text());
  const student = await db.student.findFirstOrThrow({ where: { arenaId, name: studentFields.name } });
  const credited = await post('add-student-credits', { studentId: student.id, quantity: '1' }); assert.equal(credited.status, 200, await credited.text());
  const foreignStudent = await db.student.findFirstOrThrow({ where: { arenaId: { not: arenaId } } });
  assert.equal((await post('add-student-credits', { studentId: foreignStudent.id, quantity: '1' })).status, 400);
  const player = await db.player.create({ data: { arenaId, name: 'Professor Academia Contrato' } });
  const teacherCreated = await post('create-teacher', { playerId: player.id, monthlyTarget: '10', notes: '' }); assert.equal(teacherCreated.status, 200, await teacherCreated.text());
  const teacher = await db.teacher.findFirstOrThrow({ where: { arenaId, playerId: player.id } });
  const group = await post('create-class-group', { teacherId: teacher.id, planIds: [planId], weekdays: ['1', '3'], startTimes: ['08:00', '09:00'], capacities: ['4', '3'], notes: '' }); assert.equal(group.status, 200, await group.text());
  const groupStored = await db.classGroup.findFirstOrThrow({ where: { arenaId, teacherId: teacher.id }, include: { schedules: true } }); assert.equal(groupStored.schedules.length, 2);
  const independent = await post('create-teacher-plan-with-price', { teacherId: teacher.id, name: 'Plano Professor Academia', monthlyPrice: '125,00', classesPerMonth: '8', notes: '', creditExpiryCycle: 'MONTHLY', creditExpiryDays: '' }); assert.equal(independent.status, 200, await independent.text());
  const expiry = await post('save-lesson-plan-expiry', { planId, creditExpiryCycle: 'CUSTOM', creditExpiryDays: '60' }); assert.equal(expiry.status, 200, await expiry.text()); assert.equal((await db.plan.findUniqueOrThrow({ where: { id: planId } })).creditExpiryDays, 60);
  const lessonFields = { title: 'Aula Academia Contrato', teacherId: teacher.id, studentIds: [student.id], scheduledAt: '2026-11-27T12:00:00', durationMinutes: '60', isPaid: '', price: '', paymentMethod: '', notes: '' };
  const foreignLesson = await post('create-lesson', { ...lessonFields, studentIds: [foreignStudent.id] }); assert.equal(foreignLesson.status, 400, await foreignLesson.text());
  const lessonCreated = await post('create-lesson', lessonFields); assert.equal(lessonCreated.status, 200, await lessonCreated.text());
  const lesson = await db.lesson.findFirstOrThrow({ where: { arenaId, title: lessonFields.title } });
  const completed = await post('complete-lesson', { lessonId: lesson.id }); assert.equal(completed.status, 200, await completed.text()); assert.equal((await db.student.findUniqueOrThrow({ where: { id: student.id } })).remainingClasses, 2);
  assert.equal((await post('complete-lesson', { lessonId: lesson.id })).status, 400);
  const arena = await db.arena.findUniqueOrThrow({ where: { id: arenaId } });
  assert.equal((await post('request-lesson-credit-reschedule', { arenaSlug: arena.slug, batchId: 'missing' }, 'portal')).status, 401, 'Management cookie must not authorize an athlete request');
  assert.equal((await post('save-lesson-plan-expiry', { planId }, 'portal')).status, 404);
  assert.equal((await post('request-lesson-credit-reschedule', { arenaSlug: arena.slug, batchId: 'missing' })).status, 404);
  assert.ok(await db.auditEvent.findFirst({ where: { arenaId, actorId: staffId, entityId: lesson.id } }));
  const linked = await post('create-teacher-student', { teacherId: teacher.id, studentId: student.id }); assert.equal(linked.status, 200, await linked.text());
  const athletePlayer = await db.player.create({ data: { arenaId, name: student.name, phone: '41900000777' } }); await db.student.update({ where: { id: student.id }, data: { playerId: athletePlayer.id } });
  async function athleteSession(playerId, phone) {
    const account = await db.playerAccount.create({ data: { arenaId, playerId, phone, passwordHash: '!synthetic-disabled-account' } }); const token = randomBytes(32).toString('hex');
    await db.playerSession.create({ data: { playerAccountId: account.id, token: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } }); return token;
  }
  const studentToken = await athleteSession(athletePlayer.id, '41900000777'); const teacherToken = await athleteSession(player.id, '41900000778');
  const batch = await db.lessonCreditBatch.create({ data: { arenaId, studentId: student.id, sourceKey: 'SYNTHETIC-REQUEST', granted: 1, remaining: 1, expiresAt: new Date(Date.now() + 2 * 86400000) } });
  const ownRequestFields = { arenaSlug: arena.slug, batchId: batch.id, message: 'Preferência sintética' };
  const requested = await post('request-lesson-credit-reschedule', ownRequestFields, 'portal', undefined, `arena_player_session=${studentToken}`); assert.equal(requested.status, 200, await requested.text());
  assert.equal((await post('request-lesson-credit-reschedule', ownRequestFields, 'portal', undefined, `arena_player_session=${studentToken}`)).status, 400);
  const request = await db.lessonCreditRequest.findFirstOrThrow({ where: { arenaId, batchId: batch.id } });
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const responseFields = { arenaSlug: arena.slug, requestId: request.id, status: 'APPROVED', response: 'Reposição sintética aprovada', expiresAt };
  assert.equal((await post('resolve-teacher-lesson-credit-request', responseFields, 'portal', undefined, `arena_player_session=${studentToken}`)).status, 400, 'A student cannot act as teacher');
  const resolved = await post('resolve-teacher-lesson-credit-request', responseFields, 'portal', undefined, `arena_player_session=${teacherToken}`); assert.equal(resolved.status, 200, await resolved.text());
  assert.equal((await db.lessonCreditRequest.findUniqueOrThrow({ where: { id: request.id } })).status, 'APPROVED');
  assert.ok((await db.lessonCreditBatch.findUniqueOrThrow({ where: { id: batch.id } })).expiresAt > batch.expiresAt);

  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: member.editPermissions } });
}
