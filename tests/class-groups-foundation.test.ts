import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("academy data model supports fixed class groups with capacity by weekday and time", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(schema, /model ClassGroup\s*\{/);
  assert.match(schema, /model ClassGroupSchedule\s*\{/);
  assert.match(schema, /weekday\s+Int/);
  assert.match(schema, /startTime\s+String/);
  assert.match(schema, /capacity\s+Int/);
  assert.match(schema, /model ClassGroupEnrollment\s*\{/);
  assert.match(schema, /model ClassGroupRequest\s*\{/);
});

test("academy page exposes a dedicated workspace for class groups", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/aulas/page.tsx"), "utf8");
  const workspace = readFileSync(resolve(process.cwd(), "src/components/teachers/class-group-workspace.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /ClassGroupWorkspace/);
  assert.match(workspace, /Turmas e horários/);
  assert.match(styles, /\.class-group-workspace[^}]*border-radius/);
  assert.match(styles, /\.class-group-schedule-row[^}]*grid-template-columns/);
});

test("athlete portal offers active class groups as requests instead of direct enrollments", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/class-groups.ts"), "utf8");

  assert.match(portal, /Solicitar vaga/);
  assert.match(actions, /requestClassGroupAction/);
  assert.match(actions, /requirePublicPlayerAuth/);
});

test("athlete portal shows class groups only below the selected teacher", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(portal, /const selectedClassGroups = selectedTeacher/);
  assert.match(portal, /portal-class-group-list portal-selected-teacher-groups/);
  assert.match(portal, /selectedClassGroups\.length/);
  assert.match(styles, /\.portal-class-group-list \.button \{[^}]*padding:/);
});

test("arena approval requires a plan before creating a class enrollment", () => {
  const workspace = readFileSync(resolve(process.cwd(), "src/components/teachers/class-group-workspace.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/class-groups.ts"), "utf8");

  assert.match(workspace, /Solicitações pendentes/);
  assert.match(workspace, /name="planId"/);
  assert.match(actions, /approveClassGroupRequestAction/);
  assert.match(actions, /monthlyPriceCents/);
});

test("teacher portal management includes the teacher class groups and their occupancy", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(service, /classGroups:/);
  assert.match(portal, /Minhas turmas/);
  assert.match(portal, /vagas/);
});

test("teacher class management supports moving students and logging make-up classes", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/class-groups.ts"), "utf8");
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(schema, /model ClassGroupMakeup\s*\{/);
  assert.match(actions, /moveClassGroupStudentAction/);
  assert.match(actions, /registerClassGroupMakeupAction/);
  assert.match(portal, /Mover aluno/);
  assert.match(portal, /Registrar reposição/);
});
