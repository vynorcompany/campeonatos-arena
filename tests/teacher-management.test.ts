import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("teachers workspace manages plans and active students through a floating modal", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/professores/page.tsx"), "utf8");
  const workspace = readFileSync(resolve(process.cwd(), "src/components/teachers/teacher-management-workspace.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/academy.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(page, /TeacherManagementWorkspace/);
  assert.match(workspace, /Cadastrar professor/);
  assert.match(workspace, /teacher-modal-backdrop/);
  assert.match(workspace, /Alunos ativos/);
  assert.match(workspace, /Planos do professor/);
  assert.match(workspace, /Vincular aluno/);
  assert.match(workspace, /Novo aluno/);
  assert.match(actions, /newStudentName/);
  assert.match(actions, /createTeacherStudentAction/);
  assert.match(actions, /createTeacherPlanAction/);
  assert.match(schema, /model TeacherStudent/);
  assert.match(schema, /model TeacherPlan/);
});
