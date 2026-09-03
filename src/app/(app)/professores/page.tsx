import { TeacherManagementWorkspace } from "@/components/teachers/teacher-management-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TeachersPage() {
  const auth = await requireModuleView("teachers");
  const [teachers, clients] = await Promise.all([
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ active: "desc" }, { name: "asc" }], include: { studentAssignments: { where: { active: true }, select: { id: true } }, planAssignments: { where: { active: true }, select: { id: true } } } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true, teacher: null, mergedIntoPlayerId: null }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, email: true } }),
  ]);

  return <div className="teacher-directory-page"><header className="teacher-directory-page-header"><nav aria-label="Caminho de navegação"><span>Arena</span><i aria-hidden="true">›</i><strong>Professores</strong></nav><div><h1>Professores</h1><p>Gerencie os professores da arena</p></div></header><TeacherManagementWorkspace teachers={teachers} clients={clients} /></div>;
}
