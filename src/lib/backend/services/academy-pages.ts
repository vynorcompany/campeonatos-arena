import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { lessonCreditBalances } from '@/lib/academy/lesson-credits';
import { academyPageDataSchema, type AcademyPage } from '@/lib/backend/contracts/academy-pages';
export async function resolveAcademyPage(arenaId: string, page: AcademyPage) {
  const result = academyPageDataSchema.parse({ teachers: [], clients: [], students: [], lessons: [], bankAccounts: [], playerOptions: [], studentOptions: [], teacherOptions: [], policy: null, plans: [], classGroups: [], classGroupRequests: [] });
  await withArenaTransaction(arenaId, async tx => {
    if (page === 'teachers') {
      const [teachers, clients] = await Promise.all([
        tx.teacher.findMany({ where: { arenaId }, orderBy: [{ active: 'desc' }, { name: 'asc' }], select: { id: true, name: true, phone: true, email: true, active: true, player: { select: { photoUrl: true } }, studentAssignments: { where: { active: true }, select: { id: true } }, planAssignments: { where: { active: true }, select: { id: true } } } }),
        tx.player.findMany({ where: { arenaId, active: true, teacher: null, mergedIntoPlayerId: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true, email: true } }),
      ]); result.teachers = teachers; result.clients = clients;
    }
    if (page === 'students' || page === 'lessons') {
      const students = await tx.student.findMany({ where: { arenaId }, select: { id: true, name: true, phone: true, email: true, notes: true, playerId: true, active: true, remainingClasses: true, attendedClasses: true, missedClasses: true, player: { select: { name: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
      const balances = await lessonCreditBalances(tx, arenaId, students.map(student => student.id));
      for (const student of students) student.remainingClasses = balances.get(student.id) ?? student.remainingClasses;
      result.playerOptions = await tx.player.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
      result.students = students;
    }
    if (page === 'register' || page === 'lessons') {
      const [teachers, students, lessons, banks] = await Promise.all([
        tx.teacher.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        tx.student.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        tx.lesson.findMany({ where: { arenaId }, select: { id: true, title: true, status: true, durationMinutes: true, scheduledAt: true, teacher: { select: { name: true } }, attendances: { select: { id: true, studentId: true, status: true, student: { select: { name: true } } }, orderBy: { student: { name: 'asc' } } } }, orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }], take: 16 }),
        tx.bankAccount.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]); result.teacherOptions = teachers; result.studentOptions = students; result.lessons = lessons.map(lesson => ({ ...lesson, scheduledAt: lesson.scheduledAt?.toISOString() ?? null })); result.bankAccounts = banks;
    }
    if (page === 'lessons') {
      const [plans, groups, requests] = await Promise.all([
        tx.plan.findMany({ where: { arenaId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
        tx.classGroup.findMany({ where: { arenaId, active: true }, select: { id: true, name: true, teacher: { select: { name: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { id: true } }, schedules: { select: { id: true, weekday: true, startTime: true, capacity: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] } }, orderBy: { name: 'asc' } }),
        tx.classGroupRequest.findMany({ where: { arenaId, status: 'PENDING' }, select: { id: true, student: { select: { name: true } }, classGroup: { select: { name: true, plans: { select: { plan: { select: { id: true, name: true } } } } } } }, orderBy: { createdAt: 'asc' } }),
      ]); result.plans = plans; result.classGroups = groups; result.classGroupRequests = requests;
    }
    if (page === 'policy') result.policy = await tx.arenaOperationalSettings.findUnique({ where: { arenaId }, select: { lessonMakeupEnabled: true, lessonMakeupLeadHours: true, lessonMakeupValidityDays: true, lessonMakeupMonthEnd: true, lessonMakeupPolicy: true, lessonCreditNoticeDays: true } });
  });
  return academyPageDataSchema.parse(result);
}
