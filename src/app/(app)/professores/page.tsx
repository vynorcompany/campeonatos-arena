import { TeacherManagementWorkspace } from "@/components/teachers/teacher-management-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TeachersPage() {
  const auth = await requireModuleView("teachers");
  const teachers = await prisma.teacher.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ active: "desc" }, { name: "asc" }], include: { studentAssignments: { where: { active: true }, select: { id: true } }, planAssignments: { where: { active: true }, select: { id: true } } } });

  return <div className="stack-md workspace-page"><header className="page-header"><div><p className="eyebrow">ARENA</p><h1>Professores</h1></div></header><TeacherManagementWorkspace teachers={teachers} /></div>;
}
