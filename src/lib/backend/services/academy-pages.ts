import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { lessonCreditBalances } from '@/lib/academy/lesson-credits';
import { academyPageDataSchema, type AcademyPage } from '@/lib/backend/contracts/academy-pages';
export async function resolveAcademyPage(arenaId: string, page: AcademyPage) {
  const result = academyPageDataSchema.parse({ teachers: [], clients: [], students: [], lessons: [], bankAccounts: [], playerOptions: [], studentOptions: [], teacherOptions: [], policy: null });
  await withArenaTransaction(arenaId, async tx => {
    if (page === 'teachers') {
      const [teachers, clients] = await Promise.all([
        tx.teacher.findMany({ where: { arenaId }, orderBy: [{ active: 'desc' }, { name: 'asc' }], select: { id: true, name: true, phone: true, email: true, active: true, player: { select: { photoUrl: true } }, studentAssignments: { where: { active: true }, select: { id: true } }, planAssignments: { where: { active: true }, select: { id: true } } } }),
        tx.player.findMany({ where: { arenaId, active: true, teacher: null, mergedIntoPlayerId: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true, email: true } }),
      ]); result.teachers = teachers; result.clients = clients;
    }
    if (page === 'students') {
      const students = await tx.student.findMany({ where: { arenaId }, select: { id: true, name: true, phone: true, email: true, notes: true, playerId: true, remainingClasses: true, attendedClasses: true, missedClasses: true, player: { select: { name: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
      const balances = await lessonCreditBalances(tx, arenaId, students.map(student => student.id));
      for (const student of students) student.remainingClasses = balances.get(student.id) ?? student.remainingClasses;
      result.playerOptions = await tx.player.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
      result.students = students;
    }
    if (page === 'register') {
      const [teachers, students, lessons, banks] = await Promise.all([
        tx.teacher.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        tx.student.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        tx.lesson.findMany({ where: { arenaId }, select: { id: true, title: true, status: true, durationMinutes: true, scheduledAt: true, teacher: { select: { name: true } }, attendances: { select: { id: true, studentId: true, status: true, student: { select: { name: true } } }, orderBy: { student: { name: 'asc' } } } }, orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }], take: 16 }),
        tx.bankAccount.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]); result.teacherOptions = teachers; result.studentOptions = students; result.lessons = lessons.map(lesson => ({ ...lesson, scheduledAt: lesson.scheduledAt?.toISOString() ?? null })); result.bankAccounts = banks;
    }
    if (page === 'policy') result.policy = await tx.arenaOperationalSettings.findUnique({ where: { arenaId }, select: { lessonMakeupEnabled: true, lessonMakeupLeadHours: true, lessonMakeupValidityDays: true, lessonMakeupMonthEnd: true, lessonMakeupPolicy: true, lessonCreditNoticeDays: true } });
  });
  return academyPageDataSchema.parse(result);
}
