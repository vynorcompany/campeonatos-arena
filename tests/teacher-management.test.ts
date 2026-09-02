import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("teachers directory keeps only professors and opens creation in a floating modal", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/page.tsx"), "utf8");
  const workspace = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-management-workspace.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

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

test("teachers list opens a dedicated operational panel for the selected professor", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/page.tsx"), "utf8");
  const teacherPanel = resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx");

  const workspace = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-management-workspace.tsx"), "utf8");
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
  const detail = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"), "utf8");
  const report = resolve(process.cwd(), "src/components/teachers/teacher-monthly-report.tsx");

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
  const detail = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"), "utf8");
  const enrollment = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-enrollment-form.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");

  assert.match(enrollment, /Pesquisar cliente/);
  assert.match(enrollment, /Data de início/);
  assert.match(enrollment, /Saldo de aulas/);
  assert.match(enrollment, /Desconto/);
  assert.match(detail, /Copiar planos/);
  assert.match(actions, /financialRecurrence\.create/);
  assert.match(actions, /discountMode/);
  assert.match(actions, /dueDay/);
});

test("teacher panel archives professors and centralizes their class-group management", () => {
  const detail = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/[teacherId]/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");
  const groups = resolve(process.cwd(), "src/components/teachers/teacher-class-groups-panel.tsx");

  assert.match(detail, /Remover professor/);
  assert.match(detail, /Turmas/);
  assert.match(detail, /TeacherClassGroupsPanel/);
  assert.match(actions, /archiveTeacherAction/);
  assert.match(actions, /updateTeacherClassGroupCapacityAction/);
  assert.match(actions, /moveTeacherClassGroupStudentAction/);
  assert.ok(existsSync(groups));
});

test("teacher enrollment has responsive visual groups instead of one long row", () => {
  const enrollment = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-plan-enrollment-form.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(enrollment, /teacher-enrollment-primary/);
  assert.match(enrollment, /teacher-enrollment-financial/);
  assert.match(styles, /\.teacher-enrollment-primary/);
  assert.match(styles, /\.teacher-enrollment-financial/);
});
