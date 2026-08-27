import { TeacherManagementWorkspace } from "@/components/teachers/teacher-management-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TeachersPage() {
  const auth = await requireModuleView("teachers");
  const [teachers, students, plans] = await Promise.all([
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ active: "desc" }, { name: "asc" }], include: { studentAssignments: { where: { active: true }, include: { student: { select: { id: true, name: true, remainingClasses: true } } } }, planAssignments: { where: { active: true }, include: { plan: { select: { id: true, name: true, classesPerMonth: true, monthlyPriceCents: true } } } } } }),
    prisma.student.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, remainingClasses: true } }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, classesPerMonth: true, monthlyPriceCents: true } })
  ]);

  return <div className="stack-md workspace-page"><header className="page-header"><div><p className="eyebrow">ARENA</p><h1>Professores</h1></div></header><TeacherManagementWorkspace teachers={teachers} students={students} plans={plans} /></div>;
}
