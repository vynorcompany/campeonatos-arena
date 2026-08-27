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
  assert.match(detail, /Relatório do mês/);
  assert.match(detail, /Saldo de aulas/);
});
