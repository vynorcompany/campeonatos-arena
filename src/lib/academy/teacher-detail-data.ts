import 'server-only';
import { teacherDetailDataSchema, teacherDetailQuerySchema, type TeacherDetailQuery } from '@/lib/backend/contracts/teacher-detail';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getTeacherDetailData(arenaId: string, teacherId: string, rawQuery: TeacherDetailQuery, canRegisterPayment: boolean) {
  const query = teacherDetailQuerySchema.safeParse(rawQuery); if (!query.success) return null;
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const search = new URLSearchParams(Object.entries(query.data).filter((pair): pair is [string, string] => typeof pair[1] === 'string'));
  const data = origin ? await readBackendContract(origin, `/api/management/academy/teachers/${encodeURIComponent(teacherId)}${search.size ? `?${search}` : ''}`, teacherDetailDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 })
    : await (await import('@/lib/backend/services/teacher-detail')).resolveTeacherDetail(arenaId, teacherId, query.data, canRegisterPayment);
  if (!data) return null;
  const nullableDate = (value: string | null) => value ? new Date(value) : null;
  return { ...data, now: new Date(data.now), reportStart: new Date(data.reportStart), reportEnd: new Date(data.reportEnd),
    makeupAttendances: data.makeupAttendances.map(row => ({ makeupScheduledAt: nullableDate(row.makeupScheduledAt), makeupExpiresAt: nullableDate(row.makeupExpiresAt) })),
    activeStudentFinancialEntries: data.activeStudentFinancialEntries.map(row => ({ ...row, dueDate: nullableDate(row.dueDate), paidAt: nullableDate(row.paidAt) })),
    teacher: { ...data.teacher, planAssignments: data.teacher.planAssignments.map(assignment => ({ ...assignment,
      priceChanges: assignment.priceChanges.map(change => ({ ...change, effectiveDate: new Date(change.effectiveDate) })),
      plan: { ...assignment.plan, financialEntries: assignment.plan.financialEntries.map(row => ({ ...row, dueDate: nullableDate(row.dueDate), paidAt: nullableDate(row.paidAt) })) },
    })) },
  };
}
