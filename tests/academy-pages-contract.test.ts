import assert from 'node:assert/strict';
import test from 'node:test';
import { academyPageSchema, academyPageDataSchema } from '../src/lib/backend/contracts/academy-pages';
import { academyMutationInputSchema, portalAcademyOperations } from '../src/lib/backend/contracts/academy-mutations';
test('academy page DTOs refuse private entity fields and unknown pages', () => {
  const empty = { teachers: [], clients: [], students: [], lessons: [], bankAccounts: [], playerOptions: [], studentOptions: [], teacherOptions: [], policy: null };
  assert.deepEqual(academyPageDataSchema.parse(empty), empty);
  assert.equal(academyPageSchema.safeParse('../../private').success, false);
  assert.equal(academyPageDataSchema.safeParse({ ...empty, clients: [{ id: 'a', name: 'Cliente', phone: '', email: '', passwordHash: 'secret' }] }).success, false);
  assert.equal(academyPageDataSchema.safeParse({ ...empty, arenaId: 'private' }).success, false);
  assert.equal(academyPageDataSchema.safeParse({ ...empty, studentOptions: [{ id: 'student', name: 'Aluno', notes: 'private' }] }).success, false);
});
test('class-group makeup preserves repeated attendance targets without accepting a teacher identity', () => {
  const fields = { arenaSlug: ['arena'], attendanceIds: ['attendance-a', 'attendance-b'], slot: ['court|2026-12-01T12:00:00Z|60'] };
  assert.deepEqual(academyMutationInputSchema('schedule-teacher-makeup').parse({ fields }), { fields });
  assert.equal(academyMutationInputSchema('schedule-teacher-makeup').safeParse({ fields: { ...fields, teacherId: ['forged'] } }).success, false);
  assert.equal(portalAcademyOperations.includes('approve-class-group-request'), false);
  assert.equal(portalAcademyOperations.includes('request-class-group'), true);
});
