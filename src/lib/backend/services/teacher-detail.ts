import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { lessonCreditBalances } from '@/lib/academy/lesson-credits';
import { teacherDetailPeriod } from '@/lib/academy/teacher-detail-dates';
import { teacherDetailDataSchema, teacherDetailQuerySchema, type TeacherDetailQuery } from '@/lib/backend/contracts/teacher-detail';
export async function resolveTeacherDetail(arenaId: string, teacherId: string, rawQuery: TeacherDetailQuery, canRegisterEnrollmentPayment: boolean, instant = new Date()) {
  const query = teacherDetailQuerySchema.parse(rawQuery);
  const { now, monthStart, monthEnd, reportStart, reportEnd } = teacherDetailPeriod(query, instant);
  return withArenaTransaction(arenaId, async tx => {
    const teacher = await tx.teacher.findFirst({ where: { id: teacherId, arenaId }, select: {
      id: true, name: true, active: true, player: { select: { photoUrl: true } },
      planAssignments: { where: { active: true }, select: { planId: true, monthlyPriceCents: true, priceChanges: { where: { status: 'SCHEDULED' }, orderBy: { effectiveDate: 'asc' }, select: { id: true, amountCents: true, effectiveDate: true } },
        plan: { select: { id: true, name: true, classesPerMonth: true, creditExpiryCycle: true, creditExpiryDays: true, notes: true,
          subscriptions: { where: { status: 'ACTIVE', student: { teacherAssignments: { some: { teacherId, active: true } } } }, select: { id: true, studentId: true, dueDay: true, student: { select: { id: true, name: true, playerId: true, remainingClasses: true } } } },
          financialEntries: { select: { id: true, counterpartyName: true, playerId: true, amountCents: true, status: true, paidAt: true, dueDate: true }, orderBy: { dueDate: 'desc' } },
        } },
      } },
      lessons: { where: { scheduledAt: { gte: monthStart, lte: monthEnd } }, select: { status: true, attendances: { select: { id: true } } } },
      classGroups: { where: { active: true }, select: { id: true, name: true, notes: true, schedules: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], select: { id: true, weekday: true, startTime: true, capacity: true } }, plans: { select: { planId: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { id: true, student: { select: { id: true, name: true } } }, orderBy: { student: { name: 'asc' } } } }, orderBy: { name: 'asc' } },
    } });
    if (!teacher) return null;
    const [enrollmentBankAccounts, clients, targetTeachers, makeupAttendances] = await Promise.all([
      canRegisterEnrollmentPayment ? tx.bankAccount.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : [],
      tx.player.findMany({ where: { arenaId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true } }),
      tx.teacher.findMany({ where: { arenaId, active: true, NOT: { id: teacherId } }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      tx.lessonAttendance.findMany({ where: { student: { arenaId, teacherAssignments: { some: { teacherId, active: true } } }, makeupRequestedAt: { not: null } }, select: { makeupScheduledAt: true, makeupExpiresAt: true } }),
    ]);
    const balances = await lessonCreditBalances(tx, arenaId, teacher.planAssignments.flatMap(({ plan }) => plan.subscriptions.map(sub => sub.student.id)));
    for (const { plan } of teacher.planAssignments) for (const subscription of plan.subscriptions) subscription.student.remainingClasses = balances.get(subscription.student.id) ?? subscription.student.remainingClasses;
    const activeStudentFinancialEntries = await tx.financialEntry.findMany({ where: { arenaId, type: 'REVENUE', planId: { in: teacher.planAssignments.map(({ plan }) => plan.id) }, playerId: { in: teacher.planAssignments.flatMap(({ plan }) => plan.subscriptions.map(sub => sub.student.playerId).filter((id): id is string => Boolean(id))) } }, select: { id: true, planId: true, playerId: true, status: true, dueDate: true, paidAt: true }, orderBy: { dueDate: 'desc' } });
    // JSON dates form the wire contract; Prisma records and credentials never leave the service.
    return teacherDetailDataSchema.parse(JSON.parse(JSON.stringify({ now, reportStart, reportEnd, canRegisterEnrollmentPayment, enrollmentBankAccounts, teacher, clients, targetTeachers, makeupAttendances, activeStudentFinancialEntries })));
  });
}
