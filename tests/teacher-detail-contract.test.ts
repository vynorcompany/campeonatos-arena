import assert from 'node:assert/strict';
import test from 'node:test';
import { teacherDetailQuerySchema, teacherDetailDataSchema } from '../src/lib/backend/contracts/teacher-detail';
import { academyToday } from '../src/lib/academy/today';
test('teacher detail accepts real calendar dates and refuses authority fields', () => {
  assert.deepEqual(teacherDetailQuerySchema.parse({ inicio: '2028-02-29', fim: '2028-03-01' }), { inicio: '2028-02-29', fim: '2028-03-01' });
  for (const query of [{ inicio: '2026-02-29' }, { fim: 'invalid' }, { arenaId: 'other' }, { teacherId: 'other' }, { canRegisterPayment: true }]) assert.equal(teacherDetailQuerySchema.safeParse(query).success, false);
  assert.equal(teacherDetailDataSchema.safeParse({ teacher: {}, passwordHash: 'private' }).success, false);
  assert.equal(teacherDetailDataSchema.parse(null), null);
});
test('pure academy date preserves the São Paulo midnight boundary', () => {
  assert.equal(academyToday(new Date('2026-11-27T02:59:59Z')).toISOString(), '2026-11-26T12:00:00.000Z');
  assert.equal(academyToday(new Date('2026-11-27T03:00:00Z')).toISOString(), '2026-11-27T12:00:00.000Z');
});

import { teacherDetailDateInput, teacherDetailPeriod } from '../src/lib/academy/teacher-detail-dates';
test('teacher date inputs keep the selected calendar period in UTC and São Paulo runtimes', () => {
  const previous = process.env.TZ;
  try { for (const zone of ['UTC', 'America/Sao_Paulo']) {
    process.env.TZ = zone;
    const period = teacherDetailPeriod({ inicio: '2026-11-01', fim: '2026-11-30' }, new Date('2026-11-27T04:00:00Z'));
    assert.equal(teacherDetailDateInput(period.reportStart), '2026-11-01');
    assert.equal(teacherDetailDateInput(period.reportEnd), '2026-11-30');
    assert.equal(period.reportEnd.getHours(), 23); assert.equal(period.reportEnd.getMinutes(), 59);
    assert.equal(teacherDetailDateInput(period.now), '2026-11-27');
  } } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
