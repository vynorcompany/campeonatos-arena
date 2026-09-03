import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.doesNotMatch(workspace, /Alunos ativos/);
  assert.match(actions, /assignTeacherPlanStudentAction/);
  assert.match(actions, /createTeacherPlanWithPriceAction/);
  assert.match(schema, /model TeacherStudent/);
  assert.match(schema, /model TeacherPlan/);
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
  assert.match(styles, /\.teacher-directory-filters/);
  assert.match(styles, /\.teacher-directory-avatar/);
  assert.match(styles, /\.teacher-directory-metric/);
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
  assert.match(detail, /paidAt: \{ gte: reportStart, lte: reportEnd \}/);
  assert.ok(existsSync(report));
  const reportContent = readFileSync(report, "utf8");
  assert.match(reportContent, /Percentual do professor/);
  assert.match(reportContent, /Desmarcar do cálculo/);
  assert.match(reportContent, /Total a pagar/);
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
  assert.match(styles, /\.teacher-enrollment-primary/);
  assert.match(styles, /\.teacher-enrollment-financial/);
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
  assert.match(styles, /\.teacher-active-students-panel/);
  assert.match(styles, /\.teacher-enrollment-students/);
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
  assert.match(styles, /\.teacher-class-directory/);
  assert.match(styles, /\.teacher-class-row/);
  assert.match(styles, /\.teacher-class-weekday/);
});

test("teacher metrics keep the label and value in a vertical compact stack on every tab", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  assert.match(
    styles,
    /\.teacher-detail-page \.teacher-detail-metrics article > div/,
  );
  assert.match(
    styles,
    /\.teacher-detail-page \.teacher-detail-metrics article/,
  );
  assert.match(styles, /\.teacher-directory-item \{[^}]*min-height: 128px/);
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
  assert.match(
    styles,
    /\.teacher-delete-form > \.button, \.teacher-archive-form > \.button \{[^}]*min-height: 34px/,
  );
  assert.match(
    styles,
    /\.teacher-enrollment-form > \.button \{[^}]*grid-column: 2/,
  );
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
  assert.match(
    styles,
    /\.teacher-delete-form \.safe-action-confirmation-actions input[^}]*min-width: 112px/,
  );
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
  assert.match(actions, /prisma\.plan\.update/);
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
  const enrollmentStyles = styles.slice(
    styles.indexOf(".teacher-enrollment-financial {"),
    styles.indexOf(".teacher-enrollment-form > .button"),
  );

  assert.match(
    enrollmentStyles,
    /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    enrollmentStyles,
    /\.teacher-enrollment-financial > label \{ min-width: 0; \}/,
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
    /teacher-group-schedule-row\$\{schedules\.length > 1 \? " has-remove" : ""\}/,
  );
  assert.match(
    styles,
    /\.teacher-group-schedule-row \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, \.62fr\) minmax\(0, \.48fr\)/,
  );
  assert.match(
    styles,
    /\.teacher-group-schedule-row\.has-remove \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, \.62fr\) minmax\(0, \.48fr\) auto; \}/,
  );
  assert.match(
    styles,
    /\.teacher-group-schedule-row > label, \.teacher-group-schedule-row input, \.teacher-group-schedule-row select \{ min-width: 0; \}/,
  );
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
  assert.match(styles, /\.teacher-class-row \{[^}]*min-height: 50px/);
  assert.match(styles, /\.teacher-class-row-list \{[^}]*gap: 0/);
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
  assert.match(styles, /\.teacher-class-weekday\.weekday-1/);
  assert.match(styles, /\.teacher-class-weekday\.weekday-2/);
  assert.match(styles, /\.teacher-class-weekday\.weekday-3/);
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
  assert.match(styles, /\.teacher-student-enrollment-modal > section \{[\s\S]*grid-template-columns/);
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
  assert.match(styles, /\.teacher-active-students-panel \.teacher-student-plan-list article \{[\s\S]*min-height: 52px/);
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
  assert.match(styles, /\.teacher-student-plan-remove/);
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
  assert.match(styles, /\.teacher-directory-item \{[\s\S]*min-height: 68px/);
  assert.match(styles, /\.teacher-directory-status-dot/);
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
  assert.match(enrollment, /button-primary button-small teacher-insert-student-trigger/);
  assert.match(panel, /button button-primary button-small/);
  assert.match(styles, /\.teacher-class-actions > summary \{[^}]*width: 30px/);
  assert.match(styles, /\.teacher-student-financial-link \.status-badge\.status-pending/);
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
  assert.match(styles, /\.teacher-insert-student-trigger \{[^}]*justify-self: start/);
  assert.match(
    styles,
    /\.teacher-detail-page\.teacher-students-dashboard \.teacher-detail-metrics article \{[^}]*min-height: 92px/,
  );
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
  assert.match(actions, /tx\.plan\.upsert/);
  assert.match(actions, /tx\.teacherPlan\.upsert/);
  assert.match(actions, /planId: \{ in: sourcePlanIds \}/);
  assert.match(page, /TeacherPlanCopyDialog/);
  assert.match(page, /targetTeachers/);
  assert.match(dialog, /Copiar planos/);
  assert.match(dialog, /copyTeacherPlansAction/);
  assert.match(dialog, /onMouseDown=\{\(\) => setOpen\(false\)\}/);
});
