import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("teachers directory keeps only professors and opens creation in a floating modal", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/page.tsx"),
    "utf8",
  );
  const workspace = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-management-workspace.tsx",
    ),
    "utf8",
  );
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );
  const schema = readFileSync(
    resolve(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );

  assert.match(page, /TeacherManagementWorkspace/);
  assert.match(workspace, /Cadastrar professor/);
  assert.match(workspace, /teacher-modal-backdrop/);
  assert.match(workspace, /teacher-directory-item/);
  assert.match(workspace, /href={`\/professores\/\$\{teacher\.id\}`}/);
  assert.match(workspace, /name="playerId" required/);
  assert.match(workspace, /Selecione um cliente/);
  assert.match(page, /prisma\.player\.findMany/);
  assert.match(page, /TeacherManagementWorkspace teachers=\{teachers\} clients=\{clients\}/);
  assert.doesNotMatch(workspace, /Alunos ativos/);
  assert.match(actions, /assignTeacherPlanStudentAction/);
  assert.match(actions, /createTeacherPlanWithPriceAction/);
  assert.match(schema, /model TeacherStudent/);
  assert.match(schema, /model TeacherPlan/);
  assert.match(actions, /playerId: formData\.get\("playerId"\)/);
  assert.match(actions, /Cliente inválido ou já vinculado a outro professor/);
});

test("teacher creation fields use the compact radius standard", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styleRules("teacher-modal", {"context":".grid-form :where(input"}), /border-radius: 7px/);
});

test("teachers directory presents searchable operational rows with status and metrics", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/page.tsx"),
    "utf8",
  );
  const workspace = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-management-workspace.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(page, /teacher-directory-page/);
  assert.match(workspace, /teacher-directory-filters/);
  assert.match(workspace, /teacher-directory-avatar/);
  assert.match(workspace, /teacher-directory-metric/);
  assert.ok(utilityClasses("teacher-directory-filters").length, "teacher-directory-filters has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-directory-avatar").length, "teacher-directory-avatar has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-directory-metric").length, "teacher-directory-metric has component Tailwind utilities");
});

test("teachers list opens a dedicated operational panel for the selected professor", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/page.tsx"),
    "utf8",
  );
  const teacherPanel = resolve(
    process.cwd(),
    "src/app/(app)/professores/[teacherId]/page.tsx",
  );

  const workspace = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-management-workspace.tsx",
    ),
    "utf8",
  );
  assert.match(page, /TeacherManagementWorkspace/);
  assert.match(workspace, /href={`\/professores\/\$\{teacher\.id\}`}/);
  assert.ok(existsSync(teacherPanel));
  const detail = readFileSync(teacherPanel, "utf8");
  assert.match(detail, /Planos e preços/);
  assert.match(detail, /Alunos ativos/);
  assert.match(detail, /Relatório/);
  assert.match(detail, /Saldo de aulas/);
});

test("teacher workspace separates plan, student and monthly payment-report operations", () => {
  const detail = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const report = resolve(
    process.cwd(),
    "src/components/teachers/teacher-monthly-report.tsx",
  );

  assert.match(detail, /Planos e preços/);
  assert.match(detail, /Alunos ativos/);
  assert.match(detail, /Relatório/);
  assert.match(detail, /tab === "plans"/);
  assert.match(detail, /tab === "students"/);
  assert.match(detail, /tab === "report"/);
  assert.match(detail, /entry\.paidAt >= reportStart/);
  assert.match(detail, /entry\.dueDate >= reportStart/);
  assert.ok(existsSync(report));
  const reportContent = readFileSync(report, "utf8");
  assert.match(reportContent, /Percentual do professor/);
  assert.match(reportContent, /Desmarcar do cálculo/);
  assert.match(reportContent, /Total a pagar/);
  assert.match(reportContent, /Gerar a pagar/);
  assert.match(reportContent, /createTeacherMonthlyPayableAction/);
  assert.match(reportContent, /Contas a Pagar/);
  assert.match(detail, /canGeneratePayable/);
  assert.match(detail, /teacherStudentNames/);
  assert.match(detail, /teacherStudentNames\.has\(entry\.counterpartyName\)/);
});

test("teacher monthly reports generate one auditable payable entry from selected paid receivables", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(actions, /export async function createTeacherMonthlyPayableAction/);
  assert.match(actions, /type: "EXPENSE"/);
  assert.match(actions, /category: "Repasse de professor"/);
  assert.match(actions, /source: "TEACHER_MONTHLY_REPORT"/);
  assert.match(actions, /externalReference/);
  assert.match(actions, /status: "PAID"/);
  assert.match(actions, /teacherAssignments: \{ some: \{ teacherId: teacher\.id, active: true \} \}/);
  assert.ok(utilityClasses("teacher-report-payable-form").length, "teacher-report-payable-form has component Tailwind utilities");
});

test("teacher plans enroll searchable clients with balance, due date, discount and recurring finance", () => {
  const detail = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const enrollment = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-plan-enrollment-form.tsx",
    ),
    "utf8",
  );
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );

  assert.match(enrollment, /Pesquisar cliente/);
  assert.match(enrollment, /Data de início/);
  assert.match(enrollment, /Saldo de aulas/);
  assert.match(enrollment, /Desconto/);
  assert.match(detail, /TeacherPlanEnrollmentForm/);
  assert.match(detail, /variant="students"/);
  assert.match(actions, /financialRecurrence\.create/);
  assert.match(actions, /discountMode/);
  assert.match(actions, /dueDay/);
});

test("teacher panel archives professors and centralizes their class-group management", () => {
  const detail = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );
  const groups = resolve(
    process.cwd(),
    "src/components/teachers/teacher-class-groups-panel.tsx",
  );

  assert.match(detail, /Desativar professor/);
  assert.match(detail, /Turmas/);
  assert.match(detail, /TeacherClassGroupsPanel/);
  assert.match(actions, /archiveTeacherAction/);
  assert.match(actions, /updateTeacherClassGroupCapacityAction/);
  assert.match(actions, /moveTeacherClassGroupStudentAction/);
  assert.ok(existsSync(groups));
});

test("teacher enrollment has responsive visual groups instead of one long row", () => {
  const enrollment = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-plan-enrollment-form.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(enrollment, /teacher-enrollment-primary/);
  assert.match(enrollment, /teacher-enrollment-financial/);
  assert.ok(utilityClasses("teacher-enrollment-primary").length, "teacher-enrollment-primary has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-enrollment-financial").length, "teacher-enrollment-financial has component Tailwind utilities");
});

test("active students use a dedicated teacher dashboard with summary and enrollment workspace", () => {
  const detail = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const enrollment = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-plan-enrollment-form.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(detail, /teacher-students-dashboard/);
  assert.match(detail, /teacher-active-students-panel/);
  assert.match(detail, /teacher-detail-metric-icon/);
  assert.match(enrollment, /teacher-enrollment-students/);
  assert.ok(utilityClasses("teacher-active-students-panel").length, "teacher-active-students-panel has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-enrollment-students").length, "teacher-enrollment-students has component Tailwind utilities");
});

test("teacher classes use a schedule-first directory with a dedicated create action", () => {
  const groups = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-class-groups-panel.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(groups, /teacher-class-directory/);
  assert.match(groups, /teacher-class-row/);
  assert.match(groups, /teacher-class-create-panel/);
  assert.ok(utilityClasses("teacher-class-directory").length, "teacher-class-directory has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-class-row").length, "teacher-class-row has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-class-weekday").length, "teacher-class-weekday has component Tailwind utilities");
});

test("teacher metrics keep the label and value in a vertical compact stack on every tab", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.ok(utilityClasses("teacher-detail-page").length, "teacher-detail-page has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-detail-page").length, "teacher-detail-page has component Tailwind utilities");
  assert.match(styleRules("teacher-directory-item"), /min-height: 68px/);
});

test("teacher tabs keep one shared hero and metric layout", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(styleRules("teacher-detail-page"), /row-gap: 24px[\s\S]*max-width: 1460px/);
  assert.match(styleRules("teacher-detail-page", {"context":".teacher-page-actions"}), /padding-top: 64px/);
  assert.match(styleRules("teacher-detail-page", {"context":".teacher-detail-tabs"}), /row-gap: 20px/);
  assert.doesNotMatch(styles, /\.teacher-students-dashboard \.teacher-detail-tabs/);
});

test("teacher classes open their creation form in a visible floating modal", () => {
  const panel = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-class-groups-panel.tsx",
    ),
    "utf8",
  );

  assert.match(panel, /teacher-class-create-modal/);
  assert.match(panel, /setCreateOpen\(true\)/);
});

test("untouched test teachers can be permanently deleted from their management panel", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );

  assert.match(page, /deleteTeacherAction/);
  assert.match(page, /Excluir professor/);
  assert.match(actions, /export async function deleteTeacherAction/);
});

test("teacher destructive confirmations and enrollment actions stay compact", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const form = readFileSync(
    resolve(process.cwd(), "src/components/forms/safe-action-form.tsx"),
    "utf8",
  );

  assert.match(form, /safe-action-confirmation/);
  assert.match(styleRules("teacher-delete-form", {"context":"> .button"}), /min-height: 34px/);
  assert.match(styleRules("teacher-enrollment-form", {"context":"> .button"}), /grid-column: 2/);
});

test("inactive test teachers can be deleted after removable plan links are cleaned up", () => {
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );

  assert.match(
    actions,
    /const historicalLinks = \[\s*teacher\._count\.lessons,\s*teacher\._count\.scheduleOccurrences,\s*teacher\._count\.payrollEntries,\s*teacher\._count\.classGroups,\s*teacher\._count\.classGroupMakeups,?\s*\]/,
  );
  assert.match(
    actions,
    /tx\.teacherPlan\.deleteMany\(\{ where: \{ teacherId: teacher\.id \} \}\)/,
  );
  assert.match(
    actions,
    /tx\.teacherStudent\.deleteMany\(\{ where: \{ teacherId: teacher\.id \} \}\)/,
  );
  assert.match(
    actions,
    /tx\.teacher\.delete\(\{ where: \{ id: teacher\.id \} \}\)/,
  );
});

test("teacher deletion stays inside an actions menu with an uncropped confirmation input", () => {
  const [page, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /teacher-actions-menu/);
  assert.match(styleRules("teacher-delete-form", {context:".safe-action-confirmation-actions input"}), /min-width: 112px/);
});

test("class groups created from the teacher panel use the teacher permission scope", () => {
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );
  const panel = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-class-groups-panel.tsx",
    ),
    "utf8",
  );

  assert.match(
    actions,
    /export async function createClassGroupAction\(formData: FormData\) \{\s*const auth = await requireModuleEdit\("teachers"\)/,
  );
  assert.match(panel, /Selecione ao menos um plano para a turma/);
});

test("class group plan selection validates the submitted checkboxes instead of stale visual state", () => {
  const [form, panel] = [
    readFileSync(
      resolve(process.cwd(), "src/components/forms/safe-action-form.tsx"),
      "utf8",
    ),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
  ];

  assert.match(form, /validate\?: \(formData: FormData\) => string \| null/);
  assert.match(
    form,
    /const formData = new FormData\(event\.currentTarget\);\s*const validationError = validate\?\.\(formData\)/,
  );
  assert.match(
    panel,
    /validate=\{\(formData\)\s*=>\s*formData\.getAll\("planIds"\)\.length/,
  );
  assert.doesNotMatch(panel, /checked=\{selectedPlanIds/);
});

test("existing teacher plans can be edited without changing active subscriptions", () => {
  const [actions, page] = [
    readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8"),
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
  ];

  assert.match(
    actions,
    /export async function updateTeacherPlanWithPriceAction/,
  );
  assert.match(actions, /prisma\.teacherPlan\.update/);
  assert.match(page, /TeacherPlanEditor/);
  assert.match(
    readFileSync(
      resolve(process.cwd(), "src/components/teachers/teacher-plan-editor.tsx"),
      "utf8",
    ),
    /updateTeacherPlanWithPriceAction/,
  );
});

test("plan enrollment keeps financial fields inside a compact three-column grid", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const enrollmentStyles = styleRules("teacher-enrollment-financial");

  assert.match(
    enrollmentStyles,
    /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    enrollmentStyles,
    /min-width: 0/,
  );
});

test("class creation keeps day, time and capacity aligned inside the modal", () => {
  const [panel, styles] = [
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(
    panel,
    /viewStyles\.teacher_group_schedule_row\}\$\{schedules\.length > 1 \? " has-remove" : ""\}/,
  );
  assert.match(styleRules("teacher-group-schedule-row"), /grid-template-columns: minmax\(0, 1fr\) minmax\(0, \.62fr\) minmax\(0, \.48fr\)/);
  assert.match(styleRules("teacher-group-schedule-row", {"context":".has-remove"}), / grid-template-columns: minmax\(0, 1fr\) minmax\(0, \.62fr\) minmax\(0, \.48fr\) auto; /);
  assert.match(styleRules("teacher-group-schedule-row", {"context":"> label"}), / min-width: 0; /);
});

test("existing class groups can be edited with their plans and fixed schedules", () => {
  const [actions, panel, page] = [
    readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8"),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
  ];

  assert.match(actions, /export async function updateTeacherClassGroupAction/);
  assert.match(actions, /prisma\.classGroup\.update/);
  assert.match(panel, /updateTeacherClassGroupAction/);
  assert.match(panel, /EDITAR TURMA/);
  assert.match(panel, /Editar turma/);
  assert.match(page, /plans: \{ select: \{ planId: true \} \}/);
});

test("teacher class groups use a compact table-like directory for larger schedules", () => {
  const [panel, styles] = [
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(panel, /teacher-class-list-heading/);
  assert.match(panel, />Turma</);
  assert.match(panel, />Dia e horário</);
  assert.match(styleRules("teacher-class-row"), /min-height: 50px/);
  assert.match(styleRules("teacher-class-row-list"), /gap: 0/);
});

test("class row action menus close when the user clicks outside them", () => {
  const panel = readFileSync(
    resolve(
      process.cwd(),
      "src/components/teachers/teacher-class-groups-panel.tsx",
    ),
    "utf8",
  );

  assert.match(
    panel,
    /document\.addEventListener\("pointerdown", closeClassActionMenus\)/,
  );
  assert.match(panel, /\.teacher-class-actions\[open\]/);
  assert.match(panel, /target\.closest\("\.teacher-class-actions"\)/);
});

test("plan editing returns a safe validation message and uses a dismissible modal", () => {
  const [actions, editor, form] = [
    readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8"),
    readFileSync(
      resolve(process.cwd(), "src/components/teachers/teacher-plan-editor.tsx"),
      "utf8",
    ),
    readFileSync(
      resolve(process.cwd(), "src/components/forms/safe-action-form.tsx"),
      "utf8",
    ),
  ];

  assert.match(actions, /updateTeacherPlanWithPriceAction/);
  assert.match(actions, /return \{ error:/);
  assert.match(editor, /teacher-plan-edit-modal/);
  assert.match(editor, /onMouseDown=\{\(\) => setOpen\(false\)\}/);
  assert.match(
    form,
    /result &&\s*typeof result === "object" &&\s*"error" in result/,
  );
});

test("class groups can be duplicated from their action menu with schedules and plans prefilled", () => {
  const [panel, styles] = [
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(panel, /Duplicar turma/);
  assert.match(panel, /const duplicateGroup/);
  assert.match(panel, /setCreatePlanIds\(group\.plans\.map/);
  assert.ok(utilityClasses("teacher-class-weekday").length, "teacher-class-weekday has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-class-weekday").length, "teacher-class-weekday has component Tailwind utilities");
  assert.ok(utilityClasses("teacher-class-weekday").length, "teacher-class-weekday has component Tailwind utilities");
});

test("teacher workspace keeps plan creation and student enrollment in focused dialogs", () => {
  const [page, enrollment, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-plan-enrollment-form.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /TeacherPlanCreateDialog/);
  assert.match(page, /TeacherPlanCreateDialog/);
  assert.doesNotMatch(page, /<TeacherPlanEnrollmentForm\s+[\s\S]*activePlan/);
  assert.match(enrollment, /teacher-student-enrollment-modal/);
  assert.match(enrollment, /teacher-enrollment-financial/);
  assert.match(styleRules("teacher-student-enrollment-modal", {"context":"> section"}), /grid-template-columns/);
});

test("active-student rows expose a compact class assignment and financial shortcut", () => {
  const [page, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /teacher-student-row-link/);
  assert.match(page, /teacher-student-financial-link/);
  assert.match(page, /financeiro\/contas-a-receber/);
  assert.match(styleRules("teacher-active-students-panel", {"context":".teacher-student-plan-list article"}), /min-height: 52px/);
});

test("active students can be removed from a teacher plan with confirmation", () => {
  const [page, actions, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /removeTeacherPlanStudentAction/);
  assert.match(page, /Remover do plano/);
  assert.match(page, /confirmKeyword="REMOVER"/);
  assert.match(actions, /export async function removeTeacherPlanStudentAction/);
  assert.match(actions, /status: "CANCELED"/);
  assert.ok(utilityClasses("teacher-student-plan-remove").length, "teacher-student-plan-remove has component Tailwind utilities");
});

test("teachers directory uses compact rows and an explicit status indicator", () => {
  const [workspace, styles] = [
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-management-workspace.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(workspace, /teacher-directory-status-dot/);
  assert.match(styleRules("teacher-directory-item"), /min-height: 68px/);
  assert.ok(utilityClasses("teacher-directory-status-dot").length, "teacher-directory-status-dot has component Tailwind utilities");
});

test("teacher groups follow the weekday order and retain compact, clear controls", () => {
  const [page, enrollment, panel, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-plan-enrollment-form.tsx",
      ),
      "utf8",
    ),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /const classGroupsBySchedule/);
  assert.match(page, /weekday === 0 \? 7/);
  assert.match(page, /groups=\{classGroupsBySchedule\.map/);
  assert.match(page, /classGroupsBySchedule\s*\.filter/);
  assert.match(enrollment, /EventIcon name="user-plus"/);
  assert.match(enrollment, /viewStyles\.button_button_primary_button_small_teacher_insert_student_trigger/);
  assert.match(panel, /viewStyles\.button_button_primary_button_small/);
  assert.match(styleRules("teacher-class-actions", {"context":"> summary"}), /width: 30px/);
  assert.ok(utilityClasses("teacher-student-financial-link").length, "teacher-student-financial-link has component Tailwind utilities");
});

test("teacher workspace uses client photos, vector icons and matching compact metrics", () => {
  const [page, classPanel, styles] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(
      resolve(
        process.cwd(),
        "src/components/teachers/teacher-class-groups-panel.tsx",
      ),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ];

  assert.match(page, /player: \{ select: \{ photoUrl: true \} \}/);
  assert.match(page, /teacher\.player\?\.photoUrl/);
  assert.match(page, /EventIcon name="users" size=\{16\}/);
  assert.match(classPanel, /EventIcon name="users" size=\{14\}/);
  assert.match(styleRules("teacher-insert-student-trigger"), /justify-self: start/);
  assert.match(styleRules("teacher-detail-page", {"context":".teacher-detail-metrics article"}), /min-height: 92px/);
});

test("teacher plans can be copied to another active professor in a compact dialog", () => {
  const [page, actions] = [
    readFileSync(
      resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
      "utf8",
    ),
    readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8"),
  ];
  const dialogPath = resolve(
    process.cwd(),
    "src/components/teachers/teacher-plan-copy-dialog.tsx",
  );

  assert.ok(existsSync(dialogPath));
  const dialog = readFileSync(dialogPath, "utf8");
  assert.match(actions, /export async function copyTeacherPlansAction/);
  assert.match(actions, /planAssignments: \{[\s\S]*include: \{[\s\S]*plan: \{/);
  assert.match(actions, /tx\.teacherPlan\.upsert/);
  assert.match(actions, /tx\.teacherPlan\.upsert/);
  assert.match(actions, /planId: \{ in: sourcePlanIds \}/);
  assert.match(page, /TeacherPlanCopyDialog/);
  assert.match(page, /targetTeachers/);
  assert.match(dialog, /Copiar planos/);
  assert.match(dialog, /copyTeacherPlansAction/);
  assert.match(dialog, /onMouseDown=\{\(\) => setOpen\(false\)\}/);
});

test("teacher plans identify their owner and flag active students without a financial entry", () => {
  const detail = readFileSync(
    resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"),
    "utf8",
  );
  const financePlans = readFileSync(
    resolve(process.cwd(), "src/app/(app)/financeiro/planos/page.tsx"),
    "utf8",
  );

  assert.match(detail, /Professor:\s*\{teacher\.name\}/);
  assert.match(detail, /Sem lançamento atribuído/);
  assert.match(financePlans, /teacherAssignments/);
  assert.match(financePlans, /Professor:/);
});

test("class groups derive their name from weekday and time and cap capacity at four", () => {
  const actions = readFileSync(
    resolve(process.cwd(), "src/lib/actions/academy.ts"),
    "utf8",
  );
  const panel = readFileSync(
    resolve(process.cwd(), "src/components/teachers/teacher-class-groups-panel.tsx"),
    "utf8",
  );

  assert.match(actions, /getClassGroupName\(schedules\)/);
  assert.match(actions, /\.max\(4\)/);
  assert.match(actions, /name: getClassGroupName\(schedules\)/);
  assert.doesNotMatch(panel, /name="name"/);
  assert.match(panel, /max="4"/);
  assert.match(panel, /capacity: "4"/);
});

test("student enrollment closes only the client picker after a client is selected and scopes financial writes", () => {
  const form = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-enrollment-form.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");

  assert.match(form, /const \[modalOpen, setModalOpen\] = useState\(false\)/);
  assert.match(form, /const \[clientPickerOpen, setClientPickerOpen\] = useState\(false\)/);
  assert.match(form, /setClientPickerOpen\(false\)/);
  assert.match(form, /clientPickerOpen && matches\.length/);
  assert.match(actions, /assignTeacherPlanStudentAction[\s\S]*withArenaTransaction\(auth\.arenaId, async \(tx\) =>/);
});

test("student enrollment validates the destination class before sending the form", () => {
  const form = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-enrollment-form.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");

  assert.match(form, /Selecione a turma de destino para inserir o aluno/);
  assert.match(form, /Não há turma ativa compatível com este plano/);
  assert.match(actions, /Selecione o cliente, o plano e a turma de destino/);
});

test("a student has at most one active subscription for each plan", () => {
  const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260909173000_enforce_unique_active_student_plan/migration.sql"), "utf8");
  const academy = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");
  const classGroups = readFileSync(resolve(process.cwd(), "src/lib/actions/class-groups.ts"), "utf8");

  assert.match(migration, /CREATE UNIQUE INDEX "StudentSubscription_one_active_plan_per_student"/);
  assert.match(migration, /WHERE "status" = 'ACTIVE'/);
  assert.match(migration, /ROW_NUMBER\(\) OVER/);
  assert.match(academy, /studentId: student\.id, planId, status: "ACTIVE"/);
  assert.match(classGroups, /const activeSubscription = await tx\.studentSubscription\.findFirst/);
});

test("teacher pricing links a standard plan instead of duplicating its name", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");
  const createDialog = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-create-dialog.tsx"), "utf8");
  const editor = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-editor.tsx"), "utf8");

  assert.match(schema, /model TeacherPlan \{[\s\S]*monthlyPriceCents\s+Int/);
  assert.match(actions, /createTeacherPlanWithPriceAction[\s\S]*planId/);
  assert.doesNotMatch(actions, /const duplicate = await prisma\.plan\.findFirst/);
  assert.match(createDialog, /Plano padrão/);
  assert.match(createDialog, /name="planId"/);
  assert.doesNotMatch(editor, /name="name"/);
});
