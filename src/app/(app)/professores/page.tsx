import { canEditModule } from "@/lib/permissions";
import { LessonMakeupPolicySettings } from "@/components/teachers/lesson-credit-settings";
import { viewStyles } from "./page.utilities";
import { TeacherManagementWorkspace } from "@/components/teachers/teacher-management-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { getAcademyPageData } from "@/lib/academy/page-data";

export default async function TeachersPage() {
  const auth = await requireModuleView("teachers");
  const { teachers, clients } = await getAcademyPageData(auth.arenaId, 'teachers');

  return <div className={viewStyles.teacher_directory_page}><header className={viewStyles.teacher_directory_page_header}><nav className={viewStyles.page_breadcrumb} aria-label="Caminho de navegação"><span>Arena</span><i aria-hidden="true">›</i><strong>Professores</strong></nav>{canEditModule("teachers",auth.arenaRole,auth.systemRole,auth.editPermissions)?<LessonMakeupPolicySettings arenaId={auth.arenaId}/>:null}</header><TeacherManagementWorkspace teachers={teachers} clients={clients} /></div>;
}
